import { Redis } from 'ioredis'
import { Client as MinioClient } from 'minio'
import { createReadStream } from 'node:fs'
import { writeFile, unlink, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, extname } from 'node:path'
import { Readable } from 'node:stream'

const STT_QUEUE = process.env['STT_QUEUE_KEY'] ?? 'stt:queue'
const POST_PREFIX = 'transcription:post:'
const WHISPER_URL = process.env['WHISPER_URL'] ?? 'http://whisper:8080'
const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://redis:6379'
const MINIO_ENDPOINT = process.env['MINIO_ENDPOINT'] ?? 'minio'
const MINIO_PORT = parseInt(process.env['MINIO_PORT'] ?? '9000')
const MINIO_ACCESS_KEY = process.env['MINIO_ACCESS_KEY'] ?? ''
const MINIO_SECRET_KEY = process.env['MINIO_SECRET_KEY'] ?? ''
const MINIO_BUCKET = process.env['MINIO_BUCKET'] ?? 'rtcstack-recordings'
const MINIO_USE_SSL = process.env['MINIO_USE_SSL'] === 'true'

interface SttJob {
  jobId: string
  transcriptionId: string
  recordingId: string
  language: string
  speakerMap: Record<string, string>
  queuedAt: string
}

interface WhisperSegment {
  start: number
  end: number
  text: string
  words?: { word: string; start: number; end: number; probability: number }[]
}

interface WhisperResponse {
  text: string
  language: string
  duration: number
  segments: WhisperSegment[]
}

const redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null })
const minio = new MinioClient({
  endPoint: MINIO_ENDPOINT,
  port: MINIO_PORT,
  useSSL: MINIO_USE_SSL,
  accessKey: MINIO_ACCESS_KEY,
  secretKey: MINIO_SECRET_KEY,
})

const log = (msg: string) => console.log(`[stt-worker] ${new Date().toISOString()} ${msg}`)

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string))
  }
  return Buffer.concat(chunks)
}

async function transcribeFile(objectKey: string, language: string): Promise<WhisperResponse> {
  const stream = await minio.getObject(MINIO_BUCKET, objectKey) as Readable
  const buf = await streamToBuffer(stream)

  const ext = extname(objectKey) || '.mp4'
  const tmpDir = await mkdtemp(join(tmpdir(), 'stt-'))
  const tmpPath = join(tmpDir, `audio${ext}`)
  await writeFile(tmpPath, buf)

  try {
    const form = new FormData()
    form.append('file', new Blob([buf]), `audio${ext}`)
    if (language && language !== 'auto') {
      form.append('language', language)
    }

    const res = await fetch(`${WHISPER_URL}/v1/audio/transcriptions`, {
      method: 'POST',
      body: form,
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Whisper returned ${res.status}: ${text}`)
    }

    return await res.json() as WhisperResponse
  } finally {
    await unlink(tmpPath).catch(() => {})
  }
}

function msToHms(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

async function processJob(job: SttJob): Promise<void> {
  const key = `${POST_PREFIX}${job.transcriptionId}`
  log(`Processing job=${job.jobId} recording=${job.recordingId}`)

  await redis.hset(key, 'status', 'processing', 'startedAt', new Date().toISOString())

  const lang = job.language === 'en-US' ? 'en' : job.language

  let result: WhisperResponse
  try {
    result = await transcribeFile(job.recordingId, lang)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    log(`FAILED job=${job.jobId} error=${msg}`)
    await redis.hset(key, 'status', 'failed', 'error', msg, 'failedAt', new Date().toISOString())
    return
  }

  // Build plain text with timestamps
  const lines = result.segments.map((seg) => {
    const name = job.speakerMap[Object.keys(job.speakerMap)[0] ?? ''] ?? 'Speaker'
    return `[${msToHms(seg.start)}] ${name}: ${seg.text}`
  })
  const plainText = lines.join('\n')

  // Store segments in Redis
  const pipeline = redis.pipeline()
  for (const seg of result.segments) {
    pipeline.rpush(`${key}:segments`, JSON.stringify({
      startMs: Math.round(seg.start * 1000),
      endMs: Math.round(seg.end * 1000),
      text: seg.text,
      words: seg.words ?? [],
    }))
  }
  await pipeline.exec()

  await redis.hset(key,
    'status', 'completed',
    'completedAt', new Date().toISOString(),
    'language', result.language,
    'duration', String(result.duration),
    'segmentCount', String(result.segments.length),
    'text', plainText,
  )

  log(`Completed job=${job.jobId} segments=${result.segments.length} duration=${result.duration}s`)
}

async function run(): Promise<void> {
  log(`Starting. whisper=${WHISPER_URL} redis=${REDIS_URL} minio=${MINIO_ENDPOINT}:${MINIO_PORT}`)

  // Wait for whisper to be ready
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${WHISPER_URL}/health`)
      if (res.ok) { log('Whisper ready'); break }
    } catch {
      log(`Waiting for whisper... (${i + 1}/30)`)
      await new Promise((r) => setTimeout(r, 2000))
    }
  }

  log('Listening on queue: ' + STT_QUEUE)

  // Block-pop loop — BRPOP blocks until a job arrives (timeout 5s)
  while (true) {
    try {
      const result = await redis.brpop(STT_QUEUE, 5)
      if (!result) continue

      const [, raw] = result
      let job: SttJob
      try {
        job = JSON.parse(raw) as SttJob
      } catch {
        log(`Bad job payload: ${raw}`)
        continue
      }

      await processJob(job)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      log(`Loop error: ${msg} — retrying in 3s`)
      await new Promise((r) => setTimeout(r, 3000))
    }
  }
}

run().catch((err) => {
  console.error('[stt-worker] Fatal:', err)
  process.exit(1)
})
