import { describe, it, expect, vi } from 'vitest'
import { createMockCall } from './mock.js'

describe('MockCall', () => {
  it('starts with provided participants', () => {
    const call = createMockCall({
      participants: [
        { id: 'alice', name: 'Alice', role: 'host', isLocal: true },
        { id: 'bob', name: 'Bob', role: 'participant' },
      ],
    })
    expect(call.participants.size).toBe(2)
    expect(call.participants.get('alice')?.name).toBe('Alice')
  })

  it('emits participantJoined when _mock.addParticipant is called', () => {
    const call = createMockCall()
    const fn = vi.fn()
    call.on('participantJoined', fn)
    call._mock.addParticipant({ id: 'carol', name: 'Carol' })
    expect(fn).toHaveBeenCalledOnce()
    expect(fn.mock.calls[0]![0].name).toBe('Carol')
    expect(call.participants.size).toBe(1)
  })

  it('emits participantLeft when _mock.removeParticipant is called', () => {
    const call = createMockCall({ participants: [{ id: 'dave', name: 'Dave' }] })
    const fn = vi.fn()
    call.on('participantLeft', fn)
    call._mock.removeParticipant('dave')
    expect(fn).toHaveBeenCalledOnce()
    expect(call.participants.size).toBe(0)
  })

  it('emits messageReceived when _mock.sendMessage is called', () => {
    const call = createMockCall()
    const fn = vi.fn()
    call.on('messageReceived', fn)
    call._mock.sendMessage('alice', 'hello world')
    expect(fn).toHaveBeenCalledOnce()
    expect(fn.mock.calls[0]![0].text).toBe('hello world')
  })

  it('connectionState changes via _mock.setConnectionState', () => {
    const call = createMockCall({ connectionState: 'connected' })
    expect(call.connectionState).toBe('connected')
    const fn = vi.fn()
    call.on('connectionStateChanged', fn)
    call._mock.setConnectionState('disconnected')
    expect(call.connectionState).toBe('disconnected')
    expect(fn).toHaveBeenCalledWith('disconnected')
  })

  it('connect() transitions to connected', async () => {
    const call = createMockCall({ connectionState: 'idle' })
    await call.connect()
    expect(call.connectionState).toBe('connected')
  })

  it('localParticipant returns the isLocal participant', () => {
    const call = createMockCall({
      participants: [
        { id: 'me', name: 'Me', isLocal: true },
        { id: 'them', name: 'Them' },
      ],
    })
    expect(call.localParticipant?.id).toBe('me')
  })
})
