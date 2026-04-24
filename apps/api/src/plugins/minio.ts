import { type FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { Client } from 'minio'

const BUCKETS = ['rtcstack-recordings', 'rtcstack-transcripts']

export default fp(async function minioPlugin(app: FastifyInstance) {
  const client = new Client({
    endPoint: app.config.MINIO_ENDPOINT,
    port: app.config.MINIO_PORT,
    useSSL: false,
    accessKey: app.config.MINIO_ACCESS_KEY,
    secretKey: app.config.MINIO_SECRET_KEY,
  })

  for (const bucket of BUCKETS) {
    const exists = await client.bucketExists(bucket)
    if (!exists) {
      await client.makeBucket(bucket, app.config.MINIO_REGION)
      app.log.info({ bucket }, 'created minio bucket')
    }
  }

  app.decorate('minio', client)
})

declare module 'fastify' {
  interface FastifyInstance {
    minio: Client
  }
}
