import { type FastifyInstance } from 'fastify'
import { RoomServiceClient, type CreateOptions } from 'livekit-server-sdk'

export default async function roomRoutes(app: FastifyInstance) {
  let svc: RoomServiceClient

  app.addHook('onReady', async () => {
    svc = new RoomServiceClient(
      app.config.LIVEKIT_URL_INTERNAL,
      app.config.LIVEKIT_API_KEY,
      app.config.LIVEKIT_API_SECRET,
    )
  })

  app.post<{ Body: { name: string; maxParticipants?: number; emptyTimeout?: number; metadata?: string } }>(
    '/v1/rooms',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' },
            maxParticipants: { type: 'integer' },
            emptyTimeout: { type: 'integer' },
            metadata: { type: 'string' },
          },
        },
      },
    },
    async (req, reply) => {
      const opts: CreateOptions = { name: req.body.name }
      if (req.body.maxParticipants) opts.maxParticipants = req.body.maxParticipants
      if (req.body.emptyTimeout) opts.emptyTimeout = req.body.emptyTimeout
      if (req.body.metadata) opts.metadata = req.body.metadata
      const room = await svc.createRoom(opts)
      return reply.code(201).send(room)
    },
  )

  app.get('/v1/rooms', async (_req, reply) => {
    const rooms = await svc.listRooms()
    return reply.send({ rooms })
  })

  app.get<{ Params: { roomId: string } }>('/v1/rooms/:roomId', async (req, reply) => {
    const rooms = await svc.listRooms([req.params.roomId])
    const room = rooms[0]
    if (!room) return reply.code(404).send({ type: 'https://rtcstack.dev/errors/not-found', title: 'Not Found', status: 404, detail: 'Room not found' })
    return reply.send(room)
  })

  app.delete<{ Params: { roomId: string } }>('/v1/rooms/:roomId', async (req, reply) => {
    await svc.deleteRoom(req.params.roomId)
    return reply.code(204).send()
  })

  app.get<{ Params: { roomId: string } }>('/v1/rooms/:roomId/participants', async (req, reply) => {
    const participants = await svc.listParticipants(req.params.roomId)
    return reply.send({ participants })
  })

  app.delete<{ Params: { roomId: string; participantId: string } }>(
    '/v1/rooms/:roomId/participants/:participantId',
    async (req, reply) => {
      await svc.removeParticipant(req.params.roomId, req.params.participantId)
      return reply.code(204).send()
    },
  )

  app.post<{ Params: { roomId: string; participantId: string }; Body: { trackSid: string } }>(
    '/v1/rooms/:roomId/participants/:participantId/mute',
    {
      schema: {
        body: {
          type: 'object',
          required: ['trackSid'],
          properties: { trackSid: { type: 'string' } },
        },
      },
    },
    async (req, reply) => {
      await svc.mutePublishedTrack(req.params.roomId, req.params.participantId, req.body.trackSid, true)
      return reply.code(204).send()
    },
  )
}
