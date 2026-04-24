import { type FastifyInstance } from 'fastify'
import { IngressClient, IngressInput } from 'livekit-server-sdk'

export default async function ingressRoutes(app: FastifyInstance) {
  let ingress: IngressClient

  app.addHook('onReady', async () => {
    ingress = new IngressClient(
      app.config.LIVEKIT_URL_INTERNAL,
      app.config.LIVEKIT_API_KEY,
      app.config.LIVEKIT_API_SECRET,
    )
  })

  // Create ingress (RTMP or WHIP)
  app.post<{
    Params: { roomId: string }
    Body: { participantName?: string; participantIdentity?: string; type?: 'rtmp' | 'whip' }
  }>(
    '/v1/rooms/:roomId/ingress',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            participantName: { type: 'string' },
            participantIdentity: { type: 'string' },
            type: { type: 'string', enum: ['rtmp', 'whip'] },
          },
        },
      },
    },
    async (req, reply) => {
      const { roomId } = req.params
      const inputType = req.body.type === 'whip' ? IngressInput.WHIP_INPUT : IngressInput.RTMP_INPUT
      const info = await ingress.createIngress(inputType, {
        roomName: roomId,
        participantName: req.body.participantName ?? 'Ingress Stream',
        participantIdentity: req.body.participantIdentity ?? `ingress-${Date.now()}`,
      })
      return reply.code(201).send(info)
    },
  )

  // List ingress for a room
  app.get<{ Params: { roomId: string } }>(
    '/v1/rooms/:roomId/ingress',
    async (req, reply) => {
      const list = await ingress.listIngress({ roomName: req.params.roomId })
      return reply.send({ ingress: list })
    },
  )

  // Delete ingress
  app.delete<{ Params: { roomId: string; ingressId: string } }>(
    '/v1/rooms/:roomId/ingress/:ingressId',
    async (req, reply) => {
      await ingress.deleteIngress(req.params.ingressId)
      return reply.code(204).send()
    },
  )
}
