import os
import io
import tempfile
import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from faster_whisper import WhisperModel

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("whisper-service")

MODEL_NAME = os.environ.get("WHISPER_MODEL", "base")
DEVICE = os.environ.get("WHISPER_DEVICE", "cpu")
COMPUTE_TYPE = os.environ.get("WHISPER_COMPUTE_TYPE", "int8")
PORT = int(os.environ.get("WHISPER_PORT", "8080"))
DEFAULT_LANGUAGE = os.environ.get("WHISPER_LANGUAGE", "auto")

model: Optional[WhisperModel] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global model
    log.info(f"Loading faster-whisper model={MODEL_NAME} device={DEVICE} compute={COMPUTE_TYPE}")
    model = WhisperModel(MODEL_NAME, device=DEVICE, compute_type=COMPUTE_TYPE)
    log.info("Model loaded")
    yield
    model = None


app = FastAPI(title="RTCstack Whisper STT", lifespan=lifespan)


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_NAME, "device": DEVICE}


# OpenAI-compatible endpoint — same interface as POST /v1/audio/transcriptions
@app.post("/v1/audio/transcriptions")
async def transcribe(
    file: UploadFile = File(...),
    language: Optional[str] = Form(default=None),
    response_format: Optional[str] = Form(default="json"),
    timestamp_granularities: Optional[str] = Form(default=None),
):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    lang = language if language and language != "auto" else (None if DEFAULT_LANGUAGE == "auto" else DEFAULT_LANGUAGE)

    audio_bytes = await file.read()
    suffix = os.path.splitext(file.filename or "audio.wav")[1] or ".wav"

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        segments, info = model.transcribe(
            tmp_path,
            language=lang,
            beam_size=5,
            word_timestamps=(timestamp_granularities == "word"),
            vad_filter=True,
        )

        segment_list = []
        full_text_parts = []

        for seg in segments:
            full_text_parts.append(seg.text.strip())
            entry = {
                "start": round(seg.start, 3),
                "end": round(seg.end, 3),
                "text": seg.text.strip(),
            }
            if seg.words:
                entry["words"] = [
                    {"word": w.word, "start": round(w.start, 3), "end": round(w.end, 3), "probability": round(w.probability, 4)}
                    for w in seg.words
                ]
            segment_list.append(entry)

        full_text = " ".join(full_text_parts)

        if response_format == "text":
            return full_text

        return {
            "text": full_text,
            "language": info.language,
            "duration": round(info.duration, 3),
            "segments": segment_list,
        }
    finally:
        os.unlink(tmp_path)


# Short-form endpoint used by the live agent for chunk transcription
@app.post("/asr")
async def asr_chunk(
    file: UploadFile = File(...),
    language: Optional[str] = Form(default=None),
):
    return await transcribe(file=file, language=language, response_format="json")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="info")
