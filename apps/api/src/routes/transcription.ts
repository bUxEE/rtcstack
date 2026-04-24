import { type FastifyInstance, type FastifyReply } from 'fastify'
import { randomUUID } from 'node:crypto'
import { AgentDispatchClient } from 'livekit-server-sdk'

const LIVE_PREFIX = 'transcription:live:'
const POST_PREFIX = 'transcription:post:'
const STT_QUEUE = 'stt:queue'

function isLiveEnabled(app: FastifyInstance) {
  return process.env['TRANSCRIPTION_LIVE_ENABLED'] === 'true'
}
function isPostEnabled(app: FastifyInstance) {
  return process.env['TRANSCRIPTION_POST_ENABLED'] === 'true'
}

function sttUnavailable(reply: FastifyReply, mode: string) {
  return reply.code(503).send({
    type: 'https://rtcstack.dev/errors/unavailable',
    title: 'Service Unavailable',
    status: 503,
    detail: `Transcription add-on (${mode}) is not enabled. Start the docker compose profile to activate.`,
  })
}

export default async function transcriptionRoutes(app: FastifyInstance) {
  let agentDispatch: AgentDispatchClient

  app.addHook('onReady', async () => {
    agentDispatch = new AgentDispatchClient(
      app.config.LIVEKIT_URL_INTERNAL,
      app.config.LIVEKIT_API_KEY,
      app.config.LIVEKIT_API_SECRET,
    )
  })

  // ── Live transcription ────────────────────────────────────────────────────

  app.post<{
    Params: { roomId: string }
    Body: {
      language?: string
      participants?: Record<string, string>
      options?: { partialResults?: boolean; punctuation?: boolean; profanityFilter?: boolean }
    }
  }>('/v1/rooms/:roomId/transcription/start', async (req, reply) => {
    if (!isLiveEnabled(app)) return sttUnavailable(reply, 'stt-live')

    const { roomId } = req.params
    const existing = await app.redis.hget(`${LIVE_PREFIX}${roomId}`, 'status')
    if (existing === 'active') {
      const data = await app.redis.hgetall(`${LIVE_PREFIX}${roomId}`)
      return reply.code(200).send({ ...data, roomId })
    }

    const transcriptionId = `tr_${randomUUID().replace(/-/g, '').slice(0, 12)}`
    const startedAt = new Date().toISOString()
    const language = req.body.language ?? 'en-US'

    await app.redis.hset(`${LIVE_PREFIX}${roomId}`, {
      id: transcriptionId,
      status: 'active',
      startedAt,
      language,
    })
    if (req.body.participants) {
      await app.redis.hset(`${LIVE_PREFIX}${roomId}:speakers`, req.body.participants)
    }

    // Dispatch the stt-live agent to the room
    try {
      await agentDispatch.createDispatch(roomId, 'stt-live')
    } catch (err) {
      app.log.warn({ err }, 'Failed to dispatch stt-live agent — is it running?')
    }

    return reply.code(201).send({ transcriptionId, roomId, status: 'active', language, startedAt })
  })

  app.post<{ Params: { roomId: string } }>(
    '/v1/rooms/:roomId/transcription/stop',
    async (req, reply) => {
      if (!isLiveEnabled(app)) return sttUnavailable(reply, 'stt-live')
      const { roomId } = req.params
      const data = await app.redis.hgetall(`${LIVE_PREFIX}${roomId}`)
      if (!data['id']) {
        return reply.code(404).send({ type: 'https://rtcstack.dev/errors/not-found', title: 'Not Found', status: 404, detail: 'No active transcription' })
      }
      const stoppedAt = new Date().toISOString()
      await app.redis.hset(`${LIVE_PREFIX}${roomId}`, 'status', 'stopped')
      const segmentCount = await app.redis.llen(`${LIVE_PREFIX}${roomId}:segments`)
      return reply.send({ transcriptionId: data['id'], status: 'stopped', stoppedAt, segmentCount })
    },
  )

  app.get<{ Params: { roomId: string }; Querystring: { since?: string; format?: string } }>(
    '/v1/rooms/:roomId/transcription',
    async (req, reply) => {
      if (!isLiveEnabled(app)) return sttUnavailable(reply, 'stt-live')
      const { roomId } = req.params
      const data = await app.redis.hgetall(`${LIVE_PREFIX}${roomId}`)
      if (!data['id']) return reply.code(404).send({ type: 'https://rtcstack.dev/errors/not-found', title: 'Not Found', status: 404, detail: 'No transcription found' })

      const rawSegments = await app.redis.lrange(`${LIVE_PREFIX}${roomId}:segments`, 0, -1)
      const speakers = await app.redis.hgetall(`${LIVE_PREFIX}${roomId}:speakers`)

      type Segment = { startMs: number; speakerName: string; text: string; endMs: number }
      let segments: Segment[] = rawSegments.map((s) => JSON.parse(s) as Segment)

      if (req.query.since) {
        const sinceMs = new Date(req.query.since).getTime()
        segments = segments.filter((s) => s.startMs >= sinceMs)
      }

      if (req.query.format === 'text') {
        const text = segments
          .map((s) => `[${msToHms(s.startMs)}] ${s.speakerName}: ${s.text}`)
          .join('\n')
        return reply.type('text/plain').send(text)
      }

      return reply.send({
        transcriptionId: data['id'],
        roomId,
        status: data['status'],
        language: data['language'],
        speakers: Object.entries(speakers ?? {}).map(([sid, name]) => ({ sid, name })),
        segments,
      })
    },
  )

  app.patch<{ Params: { roomId: string }; Body: { participants: Record<string, string> } }>(
    '/v1/rooms/:roomId/transcription/speakers',
    {
      schema: {
        body: {
          type: 'object',
          required: ['participants'],
          properties: { participants: { type: 'object' } },
        },
      },
    },
    async (req, reply) => {
      if (!isLiveEnabled(app)) return sttUnavailable(reply, 'stt-live')
      await app.redis.hset(`${LIVE_PREFIX}${req.params.roomId}:speakers`, req.body.participants)
      return reply.code(204).send()
    },
  )

  // ── Post-call transcription ───────────────────────────────────────────────

  app.post<{
    Params: { recordingId: string }
    Body: { language?: string; participants?: Record<string, string> }
  }>('/v1/recordings/:recordingId/transcribe', async (req, reply) => {
    if (!isPostEnabled(app)) return sttUnavailable(reply, 'stt-post')

    const transcriptionId = `tr_${randomUUID().replace(/-/g, '').slice(0, 12)}`
    const job = {
      jobId: `job_${randomUUID().replace(/-/g, '').slice(0, 8)}`,
      transcriptionId,
      recordingId: req.params.recordingId,
      language: req.body.language ?? 'en-US',
      speakerMap: req.body.participants ?? {},
      queuedAt: new Date().toISOString(),
    }

    await app.redis.rpush(STT_QUEUE, JSON.stringify(job))
    await app.redis.hset(`${POST_PREFIX}${transcriptionId}`, {
      status: 'queued',
      recordingId: req.params.recordingId,
      queuedAt: job.queuedAt,
      language: job.language,
    })

    return reply.code(202).send({ transcriptionId, recordingId: req.params.recordingId, status: 'queued', queuedAt: job.queuedAt })
  })

  app.get<{ Querystring: { roomId?: string; recordingId?: string; type?: string; limit?: number; offset?: number } }>(
    '/v1/transcriptions',
    async (req, reply) => {
      const keys = await app.redis.keys(`${POST_PREFIX}*`)
      const transcriptions = []
      for (const key of keys) {
        if (key.includes(':')) continue // skip sub-keys
        const data = await app.redis.hgetall(key)
        if (!data['status']) continue
        transcriptions.push({ transcriptionId: key.replace(POST_PREFIX, ''), ...data })
      }
      return reply.send({ total: transcriptions.length, transcriptions })
    },
  )

  app.get<{ Params: { transcriptionId: string }; Querystring: { format?: string } }>(
    '/v1/transcriptions/:transcriptionId',
    async (req, reply) => {
      const data = await app.redis.hgetall(`${POST_PREFIX}${req.params.transcriptionId}`)
      if (!data['status']) {
        return reply.code(404).send({ type: 'https://rtcstack.dev/errors/not-found', title: 'Not Found', status: 404, detail: 'Transcription not found' })
      }
      return reply.send({ transcriptionId: req.params.transcriptionId, ...data })
    },
  )

  app.delete<{ Params: { transcriptionId: string } }>(
    '/v1/transcriptions/:transcriptionId',
    async (req, reply) => {
      const keys = await app.redis.keys(`${POST_PREFIX}${req.params.transcriptionId}*`)
      if (keys.length > 0) await app.redis.del(...keys)
      return reply.code(204).send()
    },
  )
}

function msToHms(ms: number): string {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}
