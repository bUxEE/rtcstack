import { type FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import Env from '@fastify/env'

const schema = {
  type: 'object',
  required: [
    'API_PORT',
    'API_KEY',
    'API_SECRET',
    'LIVEKIT_URL_INTERNAL',
    'LIVEKIT_WSS_URL',
    'LIVEKIT_API_KEY',
    'LIVEKIT_API_SECRET',
    'REDIS_URL',
  ],
  properties: {
    API_PORT: { type: 'integer', default: 3000 },
    API_KEY: { type: 'string' },
    API_SECRET: { type: 'string' },
    NODE_ENV: { type: 'string', default: 'development' },
    LOG_LEVEL: { type: 'string', default: 'info' },
    TOKEN_TTL_SECONDS: { type: 'integer', default: 21600 },
    LIVEKIT_URL_INTERNAL: { type: 'string' },
    LIVEKIT_WSS_URL: { type: 'string' },
    LIVEKIT_API_KEY: { type: 'string' },
    LIVEKIT_API_SECRET: { type: 'string' },
    REDIS_URL: { type: 'string' },
    MINIO_ENDPOINT: { type: 'string', default: 'localhost' },
    MINIO_PORT: { type: 'integer', default: 9000 },
    MINIO_ACCESS_KEY: { type: 'string', default: '' },
    MINIO_SECRET_KEY: { type: 'string', default: '' },
    MINIO_BUCKET: { type: 'string', default: 'rtcstack-recordings' },
    MINIO_REGION: { type: 'string', default: 'us-east-1' },
    CORS_ORIGINS: { type: 'string', default: '' },
    TRANSCRIPTION_LIVE_ENABLED: { type: 'boolean', default: false },
    TRANSCRIPTION_POST_ENABLED: { type: 'boolean', default: false },
    RATE_LIMIT_MAX: { type: 'integer', default: 100 },
    RATE_LIMIT_WINDOW_MS: { type: 'integer', default: 60000 },
  },
}

export default fp(async function config(app: FastifyInstance) {
  await app.register(Env, { schema, dotenv: true })
})

declare module 'fastify' {
  interface FastifyInstance {
    config: {
      API_PORT: number
      API_KEY: string
      API_SECRET: string
      NODE_ENV: string
      LOG_LEVEL: string
      TOKEN_TTL_SECONDS: number
      LIVEKIT_URL_INTERNAL: string
      LIVEKIT_WSS_URL: string
      LIVEKIT_API_KEY: string
      LIVEKIT_API_SECRET: string
      REDIS_URL: string
      MINIO_ENDPOINT: string
      MINIO_PORT: number
      MINIO_ACCESS_KEY: string
      MINIO_SECRET_KEY: string
      MINIO_BUCKET: string
      MINIO_REGION: string
      CORS_ORIGINS: string
      TRANSCRIPTION_LIVE_ENABLED: boolean
      TRANSCRIPTION_POST_ENABLED: boolean
      RATE_LIMIT_MAX: number
      RATE_LIMIT_WINDOW_MS: number
    }
  }
}
