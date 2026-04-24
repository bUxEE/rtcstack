import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createMockCall } from '@rtcstack/sdk/mock'
import { CallProvider } from '../context'
import { ControlBar } from './ControlBar'

function makeWrapper(call: ReturnType<typeof createMockCall>) {
  return ({ children }: { children: React.ReactNode }) => (
    <CallProvider call={call as never}>{children}</CallProvider>
  )
}

describe('ControlBar', () => {
  it('renders mic, camera, screen share, and leave buttons', () => {
    const call = createMockCall({ participants: [{ id: 'local', name: 'Me', isLocal: true }] })
    render(<ControlBar />, { wrapper: makeWrapper(call) })
    expect(screen.getByLabelText('Mute microphone')).toBeInTheDocument()
    expect(screen.getByLabelText('Turn camera off')).toBeInTheDocument()
    expect(screen.getByLabelText('Share screen')).toBeInTheDocument()
    expect(screen.getByLabelText('Leave call')).toBeInTheDocument()
  })

  it('calls onLeave when leave button is clicked', async () => {
    const call = createMockCall({ participants: [{ id: 'local', name: 'Me', isLocal: true }] })
    const onLeave = vi.fn()
    render(<ControlBar onLeave={onLeave} />, { wrapper: makeWrapper(call) })
    fireEvent.click(screen.getByLabelText('Leave call'))
    await vi.waitFor(() => expect(onLeave).toHaveBeenCalledOnce())
  })

  it('shows unmute label when mic is muted', () => {
    const call = createMockCall({ participants: [{ id: 'local', name: 'Me', isLocal: true, isMuted: true }] })
    render(<ControlBar />, { wrapper: makeWrapper(call) })
    expect(screen.getByLabelText('Unmute microphone')).toBeInTheDocument()
  })

  it('shows turn camera on label when camera is off', () => {
    const call = createMockCall({ participants: [{ id: 'local', name: 'Me', isLocal: true, isCameraOff: true }] })
    render(<ControlBar />, { wrapper: makeWrapper(call) })
    expect(screen.getByLabelText('Turn camera on')).toBeInTheDocument()
  })
})
