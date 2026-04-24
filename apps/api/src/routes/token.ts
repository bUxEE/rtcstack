import { type FastifyInstance } from 'fastify'
import { AccessToken } from 'livekit-server-sdk'

type Role = 'host' | 'moderator' | 'participant' | 'viewer'

interface TokenBody {
  roomId: string
  userId: string
  name: string
  role: Role
  metadata?: Record<string, unknown>
}

function grantsForRole(role: Role) {
  switch (role) {
    case 'host':
      return {
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
        roomAdmin: true,
        canMute: true,
      }
    case 'moderator':
      return {
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
        roomAdmin: false,
        canMute: true,
      }
    case 'viewer':
      return {
        roomJoin: true,
        canPublish: false,
        canSubscribe: true,
        canPublishData: false,
        roomAdmin: false,
        canMute: false,
      }
    default:
      return {
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
        roomAdmin: false,
        canMute: false,
      }
  }
}

const tokenBodySchema = {
  type: 'object',
  required: ['roomId', 'userId', 'name', 'role'],
  properties: {
    roomId: { type: 'string', minLength: 1 },
    userId: { type: 'string', minLength: 1 },
    name: { type: 'string', minLength: 1 },
    role: { type: 'string', enum: ['host', 'moderator', 'participant', 'viewer'] },
    metadata: { type: 'object' },
  },
}

export default async function tokenRoutes(app: FastifyInstance) {
  app.post<{ Body: TokenBody }>('/v1/token', {
    schema: {
      body: tokenBodySchema,
      response: {
        200: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            url: { type: 'string' },
            expiresAt: { type: 'string' },
          },
        },
      },
    },
  }, async (req, reply) => {
    const { roomId, userId, name, role, metadata } = req.body
    const ttl = app.config.TOKEN_TTL_SECONDS

    const at = new AccessToken(app.config.LIVEKIT_API_KEY, app.config.LIVEKIT_API_SECRET, {
      identity: userId,
      name,
      ttl,
      ...(metadata !== undefined ? { metadata: JSON.stringify(metadata) } : {}),
    })

    at.addGrant({ room: roomId, ...grantsForRole(role) })

    const token = await at.toJwt()
    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString()

    return reply.code(200).send({
      token,
      url: app.config.LIVEKIT_WSS_URL,
      expiresAt,
    })
  })

  app.post<{ Body: TokenBody }>('/v1/token/refresh', {
    schema: { body: tokenBodySchema },
  }, async (req, reply) => {
    const { roomId, userId, name, role, metadata } = req.body
    const ttl = app.config.TOKEN_TTL_SECONDS

    const at = new AccessToken(app.config.LIVEKIT_API_KEY, app.config.LIVEKIT_API_SECRET, {
      identity: userId,
      name,
      ttl,
      ...(metadata !== undefined ? { metadata: JSON.stringify(metadata) } : {}),
    })

    at.addGrant({ room: roomId, ...grantsForRole(role) })

    const token = await at.toJwt()
    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString()

    return reply.code(200).send({
      token,
      url: app.config.LIVEKIT_WSS_URL,
      expiresAt,
    })
  })
}
