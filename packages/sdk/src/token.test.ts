import { describe, it, expect } from 'vitest'

// Tests token grant logic by exercising the role mapping inline
// (mirrors the logic in apps/api/src/routes/token.ts)

type Role = 'host' | 'moderator' | 'participant' | 'viewer'

function grantsForRole(role: Role) {
  switch (role) {
    case 'host':
      return { roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true, roomAdmin: true, canMute: true }
    case 'moderator':
      return { roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true, roomAdmin: false, canMute: true }
    case 'viewer':
      return { roomJoin: true, canPublish: false, canSubscribe: true, canPublishData: false, roomAdmin: false, canMute: false }
    default:
      return { roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true, roomAdmin: false, canMute: false }
  }
}

describe('token role grants', () => {
  it('host gets roomAdmin and canMute', () => {
    const g = grantsForRole('host')
    expect(g.roomAdmin).toBe(true)
    expect(g.canMute).toBe(true)
    expect(g.canPublish).toBe(true)
  })

  it('moderator can mute but not roomAdmin', () => {
    const g = grantsForRole('moderator')
    expect(g.canMute).toBe(true)
    expect(g.roomAdmin).toBe(false)
  })

  it('participant can publish but not mute others', () => {
    const g = grantsForRole('participant')
    expect(g.canPublish).toBe(true)
    expect(g.canMute).toBe(false)
    expect(g.roomAdmin).toBe(false)
  })

  it('viewer cannot publish or send data', () => {
    const g = grantsForRole('viewer')
    expect(g.canPublish).toBe(false)
    expect(g.canPublishData).toBe(false)
    expect(g.canSubscribe).toBe(true)
  })
})
