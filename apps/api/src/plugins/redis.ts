import { type FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { Redis } from 'ioredis'

export default fp(async function redis(app: FastifyInstance) {
  const client = new Redis(app.config.REDIS_URL, {
    lazyConnect: false,
    maxRetriesPerRequest: 3,
  })

  client.on('error', (err) => app.log.error({ err }, 'Redis error'))

  await client.ping()
  app.log.info('Redis connected')

  app.decorate('redis', client)

  app.addHook('onClose', async () => {
    await client.quit()
  })
})

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis
  }
}
