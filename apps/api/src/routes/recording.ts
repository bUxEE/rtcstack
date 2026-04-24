import { type FastifyInstance } from 'fastify'
import { EgressClient, EncodedFileType, EncodedFileOutput, S3Upload } from 'livekit-server-sdk'

export default async function recordingRoutes(app: FastifyInstance) {
  let egress: EgressClient

  app.addHook('onReady', async () => {
    egress = new EgressClient(
      app.config.LIVEKIT_URL_INTERNAL,
      app.config.LIVEKIT_API_KEY,
      app.config.LIVEKIT_API_SECRET,
    )
  })

  // Start room composite recording
  app.post<{ Params: { roomId: string } }>(
    '/v1/rooms/:roomId/recording/start',
    async (req, reply) => {
      const { roomId } = req.params

      // Check if already recording (idempotent)
      const existing = await egress.listEgress(roomId)
      const active = existing.filter((e) => e.status !== undefined && e.status <= 1)
      if (active.length > 0) {
        return reply.code(200).send({ egressId: active[0]!.egressId, status: 'already_recording' })
      }

      const s3 = new S3Upload({
        accessKey: app.config.MINIO_ACCESS_KEY,
        secret: app.config.MINIO_SECRET_KEY,
        region: app.config.MINIO_REGION,
        endpoint: `http://${app.config.MINIO_ENDPOINT}:${app.config.MINIO_PORT}`,
        bucket: app.config.MINIO_BUCKET,
        forcePathStyle: true,
      })

      const fileOutput = new EncodedFileOutput({
        fileType: EncodedFileType.MP4,
        filepath: `${roomId}/{time}.mp4`,
        output: { case: 's3', value: s3 },
      })

      const info = await egress.startRoomCompositeEgress(roomId, fileOutput)

      return reply.code(201).send({
        egressId: info.egressId,
        roomId,
        status: 'recording',
        startedAt: new Date().toISOString(),
      })
    },
  )

  // Stop recording
  app.post<{ Params: { roomId: string } }>(
    '/v1/rooms/:roomId/recording/stop',
    async (req, reply) => {
      const { roomId } = req.params
      const list = await egress.listEgress(roomId)
      const active = list.filter((e) => e.status !== undefined && e.status <= 1)

      if (active.length === 0) {
        return reply.code(404).send({
          type: 'https://rtcstack.dev/errors/not-found',
          title: 'Not Found',
          status: 404,
          detail: 'No active recording for this room',
        })
      }

      await egress.stopEgress(active[0]!.egressId!)
      return reply.code(200).send({ status: 'stopped', stoppedAt: new Date().toISOString() })
    },
  )

  // Get recording status
  app.get<{ Params: { roomId: string } }>(
    '/v1/rooms/:roomId/recording',
    async (req, reply) => {
      const { roomId } = req.params
      const list = await egress.listEgress(roomId)
      const active = list.find((e) => e.status !== undefined && e.status <= 1)
      return reply.send({
        isRecording: !!active,
        egressId: active?.egressId ?? null,
        startedAt: active?.startedAt ? new Date(Number(active.startedAt) * 1000).toISOString() : null,
      })
    },
  )
}
