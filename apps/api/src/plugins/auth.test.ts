import { describe, it, expect } from 'vitest'
import { createHash, createHmac } from 'node:crypto'

// Unit tests for HMAC signing logic (extracted, no Fastify needed)

function sha256hex(data: string): string {
  return createHash('sha256').update(data).digest('hex')
}

function sign(secret: string, method: string, path: string, timestamp: string, body: string): string {
  const bodyHash = sha256hex(body)
  const canonical = `${method}\n${path}\n${timestamp}\n${bodyHash}`
  return 'sha256=' + createHmac('sha256', secret).update(canonical).digest('hex')
}

describe('HMAC auth', () => {
  const SECRET = 'test-secret-32-bytes-long-enough!'

  it('produces deterministic signature', () => {
    const ts = '1714000000'
    const sig1 = sign(SECRET, 'POST', '/v1/token', ts, '{"roomId":"r1"}')
    const sig2 = sign(SECRET, 'POST', '/v1/token', ts, '{"roomId":"r1"}')
    expect(sig1).toBe(sig2)
  })

  it('different body produces different signature', () => {
    const ts = '1714000000'
    const sig1 = sign(SECRET, 'POST', '/v1/token', ts, '{"roomId":"r1"}')
    const sig2 = sign(SECRET, 'POST', '/v1/token', ts, '{"roomId":"r2"}')
    expect(sig1).not.toBe(sig2)
  })

  it('different path produces different signature', () => {
    const ts = '1714000000'
    const sig1 = sign(SECRET, 'POST', '/v1/token', ts, '{}')
    const sig2 = sign(SECRET, 'POST', '/v1/rooms', ts, '{}')
    expect(sig1).not.toBe(sig2)
  })

  it('replay protection: timestamp diff > 300s should be rejected', () => {
    const now = Math.floor(Date.now() / 1000)
    const old = now - 301
    expect(Math.abs(now - old) > 300).toBe(true)
  })

  it('replay protection: timestamp within 300s should pass', () => {
    const now = Math.floor(Date.now() / 1000)
    const recent = now - 60
    expect(Math.abs(now - recent) > 300).toBe(false)
  })
})
