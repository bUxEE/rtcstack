import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { createMockCall } from '@rtcstack/sdk/mock'
import { CallProvider } from './context'
import {
  useConnectionState,
  useParticipants,
  useLocalParticipant,
  useMessages,
} from './hooks'

function Wrapper({ call, children }: { call: ReturnType<typeof createMockCall>; children: React.ReactNode }) {
  return <CallProvider call={call as never}>{children}</CallProvider>
}

describe('useConnectionState', () => {
  it('returns initial connection state', () => {
    const call = createMockCall({ connectionState: 'connected' })
    function Comp() {
      const s = useConnectionState()
      return <div>{s}</div>
    }
    render(<Comp />, { wrapper: ({ children }) => <Wrapper call={call}>{children}</Wrapper> })
    expect(screen.getByText('connected')).toBeInTheDocument()
  })

  it('updates when state changes', () => {
    const call = createMockCall({ connectionState: 'connected' })
    function Comp() {
      const s = useConnectionState()
      return <div>{s}</div>
    }
    render(<Comp />, { wrapper: ({ children }) => <Wrapper call={call}>{children}</Wrapper> })
    act(() => call._mock.setConnectionState('reconnecting'))
    expect(screen.getByText('reconnecting')).toBeInTheDocument()
  })
})

describe('useParticipants', () => {
  it('returns initial participants', () => {
    const call = createMockCall({
      participants: [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
      ],
    })
    function Comp() {
      const ps = useParticipants()
      return <div>{ps.map((p) => p.name).join(',')}</div>
    }
    render(<Comp />, { wrapper: ({ children }) => <Wrapper call={call}>{children}</Wrapper> })
    expect(screen.getByText('Alice,Bob')).toBeInTheDocument()
  })

  it('updates when participant joins', () => {
    const call = createMockCall({ participants: [{ id: 'p1', name: 'Alice' }] })
    function Comp() {
      const ps = useParticipants()
      return <div>{ps.map((p) => p.name).join(',')}</div>
    }
    render(<Comp />, { wrapper: ({ children }) => <Wrapper call={call}>{children}</Wrapper> })
    act(() => call._mock.addParticipant({ id: 'p2', name: 'Bob' }))
    expect(screen.getByText('Alice,Bob')).toBeInTheDocument()
  })

  it('updates when participant leaves', () => {
    const call = createMockCall({
      participants: [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
      ],
    })
    function Comp() {
      const ps = useParticipants()
      return <div>{ps.map((p) => p.name).join(',')}</div>
    }
    render(<Comp />, { wrapper: ({ children }) => <Wrapper call={call}>{children}</Wrapper> })
    act(() => call._mock.removeParticipant('p2'))
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.queryByText('Bob')).not.toBeInTheDocument()
  })
})

describe('useLocalParticipant', () => {
  it('returns the local participant', () => {
    const call = createMockCall({
      participants: [
        { id: 'local', name: 'Me', isLocal: true },
        { id: 'remote', name: 'Them' },
      ],
    })
    function Comp() {
      const lp = useLocalParticipant()
      return <div>{lp?.name ?? 'none'}</div>
    }
    render(<Comp />, { wrapper: ({ children }) => <Wrapper call={call}>{children}</Wrapper> })
    expect(screen.getByText('Me')).toBeInTheDocument()
  })

  it('returns null when no local participant', () => {
    const call = createMockCall({ participants: [{ id: 'remote', name: 'Them' }] })
    function Comp() {
      const lp = useLocalParticipant()
      return <div>{lp?.name ?? 'none'}</div>
    }
    render(<Comp />, { wrapper: ({ children }) => <Wrapper call={call}>{children}</Wrapper> })
    expect(screen.getByText('none')).toBeInTheDocument()
  })
})

describe('useMessages', () => {
  it('starts empty', () => {
    const call = createMockCall({ participants: [{ id: 'local', isLocal: true }] })
    function Comp() {
      const msgs = useMessages()
      return <div>{msgs.length}</div>
    }
    render(<Comp />, { wrapper: ({ children }) => <Wrapper call={call}>{children}</Wrapper> })
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('updates when message received', () => {
    const call = createMockCall({ participants: [{ id: 'local', isLocal: true }] })
    function Comp() {
      const msgs = useMessages()
      return <div>{msgs.length}</div>
    }
    render(<Comp />, { wrapper: ({ children }) => <Wrapper call={call}>{children}</Wrapper> })
    act(() => {
      call._mock.sendMessage('alice', 'hello')
      call._mock.sendMessage('bob', 'world')
    })
    expect(screen.getByText('2')).toBeInTheDocument()
  })
})
