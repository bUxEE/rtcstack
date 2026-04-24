import { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify'
import fp from 'fastify-plugin'
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

function canonicalString(method: string, path: string, timestamp: string, bodyHash: string) {
  return `${method}\n${path}\n${timestamp}\n${bodyHash}`
}

function sha256hex(data: string): string {
  return createHash('sha256').update(data).digest('hex')
}

export default fp(async function auth(app: FastifyInstance) {
  app.addHook('onRequest', async (req: FastifyRequest, reply: FastifyReply) => {
    if (req.url === '/v1/health') return

    const apiKey = req.headers['x-api-key']
    if (!apiKey || apiKey !== app.config.API_KEY) {
      return reply.code(401).send({
        type: 'https://rtcstack.dev/errors/unauthorized',
        title: 'Unauthorized',
        status: 401,
        detail: 'Missing or invalid X-Api-Key header',
      })
    }

    const timestamp = req.headers['x-rtcstack-timestamp']
    const signature = req.headers['x-rtcstack-signature']

    if (!timestamp || !signature) {
      return reply.code(401).send({
        type: 'https://rtcstack.dev/errors/unauthorized',
        title: 'Unauthorized',
        status: 401,
        detail: 'Missing X-RTCstack-Timestamp or X-RTCstack-Signature header',
      })
    }

    const now = Math.floor(Date.now() / 1000)
    const ts = parseInt(String(timestamp), 10)
    if (Math.abs(now - ts) > 300) {
      return reply.code(401).send({
        type: 'https://rtcstack.dev/errors/unauthorized',
        title: 'Unauthorized',
        status: 401,
        detail: 'Request timestamp too old or too far in the future (replay protection)',
      })
    }

    const body = req.body ? JSON.stringify(req.body) : ''
    const bodyHash = sha256hex(body)
    const canonical = canonicalString(req.method, req.url, String(timestamp), bodyHash)
    const expected = 'sha256=' + createHmac('sha256', app.config.API_SECRET).update(canonical).digest('hex')

    const sigBuf = Buffer.from(String(signature))
    const expBuf = Buffer.from(expected)
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return reply.code(401).send({
        type: 'https://rtcstack.dev/errors/unauthorized',
        title: 'Unauthorized',
        status: 401,
        detail: 'Invalid X-RTCstack-Signature',
      })
    }
  })
})
