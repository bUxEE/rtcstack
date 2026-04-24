import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import 'dotenv/config'

import configPlugin from './config.js'
import redisPlugin from './plugins/redis.js'
import minioPlugin from './plugins/minio.js'
import authPlugin from './plugins/auth.js'
import healthRoutes from './routes/health.js'
import tokenRoutes from './routes/token.js'
import roomRoutes from './routes/rooms.js'
import recordingRoutes from './routes/recording.js'
import webhookRoutes from './routes/webhooks.js'
import ingressRoutes from './routes/ingress.js'
import transcriptionRoutes from './routes/transcription.js'

const isDev = process.env['NODE_ENV'] === 'development'
const app = Fastify({
  logger: isDev
    ? { level: process.env['LOG_LEVEL'] ?? 'info', transport: { target: 'pino-pretty', options: { colorize: true } } }
    : { level: process.env['LOG_LEVEL'] ?? 'info' },
})

async function start() {
  await app.register(configPlugin)

  const origins: string | string[] = app.config.CORS_ORIGINS
    ? app.config.CORS_ORIGINS.split(',').map((o) => o.trim())
    : '*'

  await app.register(cors, { origin: origins })
  await app.register(rateLimit, {
    max: app.config.RATE_LIMIT_MAX,
    timeWindow: app.config.RATE_LIMIT_WINDOW_MS,
    skipOnError: false,
    keyGenerator: (req) => req.headers['x-api-key'] as string ?? req.ip,
  })
  await app.register(redisPlugin)
  await app.register(minioPlugin)
  await app.register(authPlugin)

  await app.register(healthRoutes)
  await app.register(tokenRoutes)
  await app.register(roomRoutes)
  await app.register(recordingRoutes)
  await app.register(webhookRoutes)
  await app.register(ingressRoutes)
  await app.register(transcriptionRoutes)

  app.setErrorHandler((error, _req, reply) => {
    app.log.error(error)
    if (error.validation) {
      return reply.code(400).send({
        type: 'https://rtcstack.dev/errors/validation',
        title: 'Validation Error',
        status: 400,
        detail: error.message,
      })
    }
    return reply.code(500).send({
      type: 'https://rtcstack.dev/errors/internal',
      title: 'Internal Server Error',
      status: 500,
      detail: process.env['NODE_ENV'] === 'development' ? error.message : 'An error occurred',
    })
  })

  await app.listen({ port: app.config.API_PORT, host: '0.0.0.0' })
}

start().catch((err) => {
  console.error(err)
  process.exit(1)
})
