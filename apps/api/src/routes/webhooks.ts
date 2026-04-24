import { type FastifyInstance } from 'fastify'
import { createHmac, randomUUID } from 'node:crypto'

interface WebhookConfig {
  id: string
  url: string
  events: string[]
  secret: string
  createdAt: string
}

const WEBHOOK_REDIS_PREFIX = 'rtcstack:webhooks:'
const ALL_EVENTS = [
  'room_created', 'room_closed', 'participant_joined', 'participant_left',
  'track_published', 'recording_started', 'recording_stopped',
  'ingress_started', 'ingress_stopped', 'transcription_completed',
]

export async function deliverWebhook(
  app: FastifyInstance,
  event: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const keys = await app.redis.keys(`${WEBHOOK_REDIS_PREFIX}*`)
  const configs: WebhookConfig[] = []
  for (const key of keys) {
    const raw = await app.redis.get(key)
    if (raw) configs.push(JSON.parse(raw) as WebhookConfig)
  }

  const subscribed = configs.filter((c) => c.events.includes(event) || c.events.includes('*'))

  for (const cfg of subscribed) {
    const body = JSON.stringify({ event, payload, deliveryId: randomUUID() })
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const sig = 'sha256=' + createHmac('sha256', cfg.secret).update(body).digest('hex')

    const attempt = async (delay: number) => {
      await new Promise((r) => setTimeout(r, delay))
      await fetch(cfg.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-RTCstack-Signature': sig,
          'X-RTCstack-Timestamp': timestamp,
          'X-RTCstack-Delivery': randomUUID(),
        },
        body,
      })
    }

    attempt(0).catch(() => attempt(5000).catch(() => attempt(30000).catch(() => {})))
  }
}

export default async function webhookRoutes(app: FastifyInstance) {
  // List webhooks
  app.get('/v1/webhooks', async (_req, reply) => {
    const keys = await app.redis.keys(`${WEBHOOK_REDIS_PREFIX}*`)
    const webhooks: WebhookConfig[] = []
    for (const key of keys) {
      const raw = await app.redis.get(key)
      if (raw) {
        const cfg = JSON.parse(raw) as WebhookConfig
        webhooks.push({ ...cfg, secret: '***' })
      }
    }
    return reply.send({ webhooks })
  })

  // Create webhook
  app.post<{ Body: { url: string; events?: string[]; secret?: string } }>(
    '/v1/webhooks',
    {
      schema: {
        body: {
          type: 'object',
          required: ['url'],
          properties: {
            url: { type: 'string', format: 'uri' },
            events: { type: 'array', items: { type: 'string', enum: [...ALL_EVENTS, '*'] } },
            secret: { type: 'string' },
          },
        },
      },
    },
    async (req, reply) => {
      const id = randomUUID()
      const cfg: WebhookConfig = {
        id,
        url: req.body.url,
        events: req.body.events ?? ['*'],
        secret: req.body.secret ?? createHmac('sha256', app.config.API_SECRET).update(id).digest('hex'),
        createdAt: new Date().toISOString(),
      }
      await app.redis.set(`${WEBHOOK_REDIS_PREFIX}${id}`, JSON.stringify(cfg))
      return reply.code(201).send({ ...cfg, secret: cfg.secret })
    },
  )

  // Get webhook
  app.get<{ Params: { webhookId: string } }>('/v1/webhooks/:webhookId', async (req, reply) => {
    const raw = await app.redis.get(`${WEBHOOK_REDIS_PREFIX}${req.params.webhookId}`)
    if (!raw) return reply.code(404).send({ type: 'https://rtcstack.dev/errors/not-found', title: 'Not Found', status: 404, detail: 'Webhook not found' })
    const cfg = JSON.parse(raw) as WebhookConfig
    return reply.send({ ...cfg, secret: '***' })
  })

  // Update webhook
  app.patch<{ Params: { webhookId: string }; Body: { url?: string; events?: string[] } }>(
    '/v1/webhooks/:webhookId',
    async (req, reply) => {
      const raw = await app.redis.get(`${WEBHOOK_REDIS_PREFIX}${req.params.webhookId}`)
      if (!raw) return reply.code(404).send({ type: 'https://rtcstack.dev/errors/not-found', title: 'Not Found', status: 404, detail: 'Webhook not found' })
      const cfg = JSON.parse(raw) as WebhookConfig
      if (req.body.url) cfg.url = req.body.url
      if (req.body.events) cfg.events = req.body.events
      await app.redis.set(`${WEBHOOK_REDIS_PREFIX}${req.params.webhookId}`, JSON.stringify(cfg))
      return reply.send({ ...cfg, secret: '***' })
    },
  )

  // Delete webhook
  app.delete<{ Params: { webhookId: string } }>('/v1/webhooks/:webhookId', async (req, reply) => {
    await app.redis.del(`${WEBHOOK_REDIS_PREFIX}${req.params.webhookId}`)
    return reply.code(204).send()
  })

  // Test webhook
  app.post<{ Params: { webhookId: string } }>('/v1/webhooks/:webhookId/test', async (req, reply) => {
    const raw = await app.redis.get(`${WEBHOOK_REDIS_PREFIX}${req.params.webhookId}`)
    if (!raw) return reply.code(404).send({ type: 'https://rtcstack.dev/errors/not-found', title: 'Not Found', status: 404, detail: 'Webhook not found' })
    const cfg = JSON.parse(raw) as WebhookConfig
    const body = JSON.stringify({ event: 'test', payload: { message: 'RTCstack webhook test' }, deliveryId: randomUUID() })
    const sig = 'sha256=' + createHmac('sha256', cfg.secret).update(body).digest('hex')
    try {
      const res = await fetch(cfg.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-RTCstack-Signature': sig },
        body,
      })
      return reply.send({ delivered: res.ok, statusCode: res.status })
    } catch (err) {
      return reply.send({ delivered: false, error: err instanceof Error ? err.message : 'fetch failed' })
    }
  })
}
