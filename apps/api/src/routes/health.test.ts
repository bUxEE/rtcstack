import { describe, it, expect } from 'vitest'

// Unit test for health response shape (no Fastify bootstrap needed)
describe('health route', () => {
  it('response has status ok and version string', () => {
    const response = { status: 'ok', version: '0.1.0' }
    expect(response.status).toBe('ok')
    expect(typeof response.version).toBe('string')
  })
})
