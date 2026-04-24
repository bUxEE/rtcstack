import { type FastifyInstance } from 'fastify'

export default async function healthRoutes(app: FastifyInstance) {
  app.get('/v1/health', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            version: { type: 'string' },
            capabilities: {
              type: 'object',
              properties: {
                transcriptionLive: { type: 'boolean' },
                transcriptionPost: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
  }, async () => {
    return {
      status: 'ok',
      version: '0.1.0',
      capabilities: {
        transcriptionLive: app.config.TRANSCRIPTION_LIVE_ENABLED,
        transcriptionPost: app.config.TRANSCRIPTION_POST_ENABLED,
      },
    }
  })
}
