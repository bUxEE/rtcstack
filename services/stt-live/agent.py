"""
RTCstack live STT agent.

Per room: subscribes to all audio tracks, uses RMS energy to detect speech
boundaries, sends each completed speech chunk to the Whisper REST service,
and writes timestamped segments to Redis where the API reads them.

Env vars:
  LIVEKIT_URL               ws://livekit:7880
  LIVEKIT_API_KEY           ...
  LIVEKIT_API_SECRET        ...
  WHISPER_URL               http://whisper:8080
  REDIS_URL                 redis://:pass@redis:6379
  STT_LANGUAGE              en  (or "auto")
  PAUSE_THRESHOLD_SECONDS   1.5  (silence gap that closes a speech chunk)
  SHORT_PAUSE_SECONDS       0.3  (shorter gap: flush early only if last chunk was a complete sentence)
  MAX_CHUNK_SECONDS         30.0 (hard ceiling on a single chunk)
  SPEECH_RMS_THRESHOLD      200  (16-bit PCM RMS level above which frame counts as speech)
  WHISPER_MAX_CONCURRENT    2    (max simultaneous Whisper requests per room)
  WHISPER_FILTER_PHRASES    comma-separated phrases to treat as silence hallucinations (optional)
"""

import asyncio
import io
import json
import logging
import math
import os
import re
import struct
import time
import wave
from typing import Optional

import aiohttp
import redis.asyncio as aioredis
from livekit import rtc
from livekit.agents import JobContext, WorkerOptions, cli

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("stt-live")

WHISPER_URL = os.environ.get("WHISPER_URL", "http://whisper:8080")
REDIS_URL = os.environ.get("REDIS_URL", "redis://redis:6379")
STT_LANGUAGE = os.environ.get("STT_LANGUAGE", "en")
PAUSE_THRESHOLD_SECONDS = float(os.environ.get("PAUSE_THRESHOLD_SECONDS", "1.5"))
SHORT_PAUSE_SECONDS = float(os.environ.get("SHORT_PAUSE_SECONDS", "0.3"))
MAX_CHUNK_SECONDS = float(os.environ.get("MAX_CHUNK_SECONDS", "30.0"))
SPEECH_RMS_THRESHOLD = float(os.environ.get("SPEECH_RMS_THRESHOLD", "200.0"))
WHISPER_MAX_CONCURRENT = int(os.environ.get("WHISPER_MAX_CONCURRENT", "2"))
LIVE_PREFIX = "transcription:live:"
SAMPLE_RATE = 16000
CHANNELS = 1

# Whisper hallucination phrases — common outputs on silence/noise
_FILTER_ENV = os.environ.get("WHISPER_FILTER_PHRASES", "")
WHISPER_HALLUCINATIONS: set[str] = {
    "thank you", "thank you.", "thanks for watching.", "thanks for watching",
    "you", ".", "..", "...", "…", "ugh", "hmm", "um", "uh",
}
if _FILTER_ENV:
    WHISPER_HALLUCINATIONS.update(p.strip().lower() for p in _FILTER_ENV.split(",") if p.strip())


def rms_energy(pcm: bytes) -> float:
    if len(pcm) < 2:
        return 0.0
    count = len(pcm) // 2
    samples = struct.unpack(f"<{count}h", pcm[:count * 2])
    return math.sqrt(sum(s * s for s in samples) / count)


def ends_with_terminal_punct(text: str) -> bool:
    return bool(text) and text.rstrip()[-1] in ".?!"


def clean_transcript(text: str) -> Optional[str]:
    """Normalize Whisper output: drop hallucinations, deduplicate words, ensure punctuation."""
    text = text.strip()
    if not text or text.lower() in WHISPER_HALLUCINATIONS:
        return None
    # Collapse consecutive repeated words: "hello hello hello" → "hello"
    text = re.sub(r'\b(\w+)( \1)+\b', r'\1', text, flags=re.IGNORECASE)
    # Ensure terminal punctuation
    if text and text[-1] not in ".?!,;:":
        text += "."
    # Capitalize first letter
    if text:
        text = text[0].upper() + text[1:]
    return text or None


async def transcribe_chunk(
    session: aiohttp.ClientSession,
    semaphore: asyncio.Semaphore,
    pcm: bytes,
    language: str,
) -> Optional[str]:
    """Send raw PCM as WAV to Whisper REST /asr, return cleaned transcript or None."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(2)  # 16-bit
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(pcm)
    wav_bytes = buf.getvalue()

    form = aiohttp.FormData()
    form.add_field("file", wav_bytes, filename="chunk.wav", content_type="audio/wav")
    if language and language != "auto":
        form.add_field("language", language)

    try:
        async with semaphore:
            async with session.post(
                f"{WHISPER_URL}/asr", data=form, timeout=aiohttp.ClientTimeout(total=30)
            ) as resp:
                if resp.status != 200:
                    log.warning("Whisper returned %s", resp.status)
                    return None
                data = await resp.json()
                raw = data.get("text", "").strip()
                return clean_transcript(raw)
    except Exception as exc:
        log.error("Whisper request failed: %s", exc)
        return None


async def entrypoint(ctx: JobContext):
    room_name = ctx.room.name
    redis_key = f"{LIVE_PREFIX}{room_name}"
    log.info("Agent joining room=%s", room_name)

    await ctx.connect()

    redis = aioredis.from_url(REDIS_URL, decode_responses=True)

    status = await redis.hget(redis_key, "status")
    if status != "active":
        log.info("Room %s has no active transcription session — agent exiting", room_name)
        await redis.aclose()
        return

    language = await redis.hget(redis_key, "language") or STT_LANGUAGE
    language = language.split("-")[0] if language != "auto" else "auto"

    # Semaphore prevents piling up Whisper requests when multiple speakers talk simultaneously
    whisper_sem = asyncio.Semaphore(WHISPER_MAX_CONCURRENT)

    async with aiohttp.ClientSession() as http:

        async def handle_track(
            track: rtc.RemoteTrack,
            publication: rtc.RemoteTrackPublication,
            participant: rtc.RemoteParticipant,
        ):
            if publication.kind != rtc.TrackKind.KIND_AUDIO:
                return

            log.info("Handling audio track participant=%s", participant.identity)
            audio_stream = rtc.AudioStream(track, sample_rate=SAMPLE_RATE, num_channels=CHANNELS)
            pcm_buffer = bytearray()
            start_time = time.time()
            last_speech_time = time.time()
            last_final_text = ""
            speaking_notified = False
            speaker_name = participant.name or participant.identity

            async def notify_speaking():
                nonlocal speaking_notified
                if speaking_notified:
                    return
                speaking_notified = True
                payload = json.dumps({
                    "type": "speaking",
                    "speaker": speaker_name,
                    "speakerId": participant.identity,
                }).encode()
                # unreliable is fine — it's a live indicator, dropped packets are OK
                await ctx.room.local_participant.publish_data(payload, reliable=False)

            async def flush_buffer():
                nonlocal pcm_buffer, start_time, last_speech_time, last_final_text, speaking_notified
                if not pcm_buffer:
                    return
                chunk = bytes(pcm_buffer)
                pcm_buffer = bytearray()
                segment_start_ms = int(start_time * 1000)
                start_time = time.time()
                last_speech_time = time.time()
                speaking_notified = False

                text = await transcribe_chunk(http, whisper_sem, chunk, language)
                if not text:
                    return

                last_final_text = text
                segment_end_ms = int(time.time() * 1000)

                segment = {
                    "startMs": segment_start_ms,
                    "endMs": segment_end_ms,
                    "speakerName": speaker_name,
                    "speakerId": participant.identity,
                    "text": text,
                }
                await redis.rpush(f"{redis_key}:segments", json.dumps(segment))
                log.info("Segment room=%s speaker=%s text=%r", room_name, speaker_name, text[:60])

                data_payload = json.dumps({
                    "type": "transcript",
                    "text": text,
                    "speaker": speaker_name,
                    "speakerId": participant.identity,
                    "startMs": segment_start_ms,
                }).encode()
                await ctx.room.local_participant.publish_data(data_payload, reliable=True)

            async for event in audio_stream:
                frame = event.frame
                frame_pcm = frame.data.tobytes()
                is_speech = rms_energy(frame_pcm) >= SPEECH_RMS_THRESHOLD

                if is_speech:
                    last_speech_time = time.time()
                    await notify_speaking()

                # Always buffer (including silence trailing) so words aren't clipped
                pcm_buffer.extend(frame_pcm)

                now = time.time()
                chunk_duration = len(pcm_buffer) / (SAMPLE_RATE * 2)
                silence_duration = now - last_speech_time

                should_flush = (
                    # Early flush: short pause after a sentence that already ended cleanly
                    (SHORT_PAUSE_SECONDS <= silence_duration < PAUSE_THRESHOLD_SECONDS
                     and chunk_duration > 0.3
                     and ends_with_terminal_punct(last_final_text))
                    # Normal flush: full pause threshold reached
                    or (silence_duration >= PAUSE_THRESHOLD_SECONDS and chunk_duration > 0.5)
                    # Hard ceiling: max chunk size
                    or chunk_duration >= MAX_CHUNK_SECONDS
                )
                if should_flush:
                    await flush_buffer()

            # Flush remainder when track ends
            await flush_buffer()

        # Handle tracks already subscribed when the agent joins
        for participant in ctx.room.remote_participants.values():
            for pub in participant.track_publications.values():
                if pub.track is not None:
                    asyncio.ensure_future(handle_track(pub.track, pub, participant))

        # Handle tracks subscribed after the agent joins
        @ctx.room.on("track_subscribed")
        def on_track_subscribed(
            track: rtc.RemoteTrack,
            publication: rtc.RemoteTrackPublication,
            participant: rtc.RemoteParticipant,
        ):
            asyncio.ensure_future(handle_track(track, publication, participant))

        # Stay alive while room exists and transcription is active
        while ctx.room.connection_state == rtc.ConnectionState.CONN_CONNECTED:
            status_now = await redis.hget(redis_key, "status")
            if status_now != "active":
                log.info("Transcription stopped for room=%s — agent exiting", room_name)
                break
            await asyncio.sleep(2)

    await redis.aclose()
    log.info("Agent done for room=%s", room_name)


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            agent_name="stt-live",
            ws_url=os.environ["LIVEKIT_URL"],
            api_key=os.environ["LIVEKIT_API_KEY"],
            api_secret=os.environ["LIVEKIT_API_SECRET"],
        )
    )
