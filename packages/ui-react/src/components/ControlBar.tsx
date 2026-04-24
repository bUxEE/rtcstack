import { useState } from 'react'
import { useLocalParticipant, useMediaControls, useLayout } from '../hooks.js'
import { DeviceSelector } from './DeviceSelector.js'
import type { Layout } from '@rtcstack/sdk'

export type ControlBarButton =
  | 'mic' | 'camera' | 'screenshare'
  | 'reactions' | 'layout' | 'devices' | 'leave'

const ALL_BUTTONS: ControlBarButton[] = ['mic', 'camera', 'screenshare', 'reactions', 'layout', 'devices', 'leave']
const REACTIONS = ['👍', '❤️', '😂', '🎉', '👏', '🙌']

interface Props {
  className?: string
  onLeave?: () => void
  buttons?: ControlBarButton[]
}

export function ControlBar({ className, onLeave, buttons = ALL_BUTTONS }: Props) {
  const local = useLocalParticipant()
  const { toggleMic, toggleCamera, toggleScreenShare, sendReaction, disconnect } = useMediaControls()
  const { layout, setLayout } = useLayout()
  const [devicesOpen, setDevicesOpen] = useState(false)

  const show = (btn: ControlBarButton) => buttons.includes(btn)

  const handleLeave = async () => {
    await disconnect()
    onLeave?.()
  }

  const nextLayout: Layout = layout === 'grid' ? 'spotlight' : 'grid'

  return (
    <div className={`rtc-control-bar ${className ?? ''}`} role="toolbar" aria-label="Call controls" style={{ position: 'relative' }}>
      {devicesOpen && (
        <DeviceSelector className="rtc-control-bar__devices-popover" />
      )}

      {show('mic') && (
        <button
          className={`rtc-control-bar__btn ${local?.isMuted ? 'rtc-control-bar__btn--off' : ''}`}
          onClick={toggleMic}
          aria-pressed={local?.isMuted}
          aria-label={local?.isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {local?.isMuted ? '🎤✕' : '🎤'}
        </button>
      )}

      {show('camera') && (
        <button
          className={`rtc-control-bar__btn ${local?.isCameraOff ? 'rtc-control-bar__btn--off' : ''}`}
          onClick={toggleCamera}
          aria-pressed={local?.isCameraOff}
          aria-label={local?.isCameraOff ? 'Turn camera on' : 'Turn camera off'}
        >
          {local?.isCameraOff ? '📷✕' : '📷'}
        </button>
      )}

      {show('screenshare') && (
        <button
          className={`rtc-control-bar__btn ${local?.isScreenSharing ? 'rtc-control-bar__btn--active' : ''}`}
          onClick={toggleScreenShare}
          aria-pressed={local?.isScreenSharing}
          aria-label={local?.isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
        >
          {local?.isScreenSharing ? '🖥✕' : '🖥'}
        </button>
      )}

      {show('reactions') && (
        <div className="rtc-control-bar__reactions" role="group" aria-label="Send reaction">
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              className="rtc-control-bar__btn rtc-control-bar__btn--reaction"
              onClick={() => sendReaction(emoji)}
              aria-label={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {show('layout') && (
        <button
          className="rtc-control-bar__btn"
          onClick={() => setLayout(nextLayout)}
          aria-label={`Switch to ${nextLayout} layout`}
          title={`Switch to ${nextLayout} layout`}
        >
          {layout === 'grid' ? '⊞' : '⊟'}
        </button>
      )}

      {show('devices') && (
        <button
          className={`rtc-control-bar__btn ${devicesOpen ? 'rtc-control-bar__btn--active' : ''}`}
          onClick={() => setDevicesOpen((v) => !v)}
          aria-pressed={devicesOpen}
          aria-label="Device settings"
          title="Device settings"
        >
          ⚙
        </button>
      )}

      {show('leave') && (
        <button
          className="rtc-control-bar__btn rtc-control-bar__btn--danger"
          onClick={handleLeave}
          aria-label="Leave call"
        >
          Leave
        </button>
      )}
    </div>
  )
}
