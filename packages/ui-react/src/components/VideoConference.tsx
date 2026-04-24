import { useState, useEffect, useRef } from 'react'
import type { Call } from '@rtcstack/sdk'
import { CallProvider } from '../context.js'
import { VideoGrid } from './VideoGrid.js'
import { ControlBar } from './ControlBar.js'
import type { ControlBarButton } from './ControlBar.js'
import { ChatPanel } from './ChatPanel.js'
import { ParticipantList } from './ParticipantList.js'
import { TranscriptPanel } from './TranscriptPanel.js'
import { useConnectionState } from '../hooks.js'
import { useCall } from '../context.js'
import type { ParticipantVideoProps } from './ParticipantVideo.js'

interface Reaction { id: number; emoji: string; x: number }

function ReactionsOverlay() {
  const call = useCall()
  const [reactions, setReactions] = useState<Reaction[]>([])
  const counter = useRef(0)

  useEffect(() => {
    const handler = (_from: string, emoji: string) => {
      const id = ++counter.current
      const x = 10 + Math.random() * 80
      setReactions((r) => [...r, { id, emoji, x }])
      setTimeout(() => setReactions((r) => r.filter((item) => item.id !== id)), 2500)
    }
    call.on('reactionReceived', handler)
    return () => { call.off('reactionReceived', handler) }
  }, [call])

  return (
    <div className="rtc-reactions-overlay" aria-hidden="true">
      {reactions.map((r) => (
        <span
          key={r.id}
          className="rtc-reaction-bubble"
          style={{ left: `${r.x}%` }}
        >
          {r.emoji}
        </span>
      ))}
    </div>
  )
}

interface Props {
  call: Call
  className?: string
  onLeave?: () => void
  showChat?: boolean
  showTranscript?: boolean
  showParticipants?: boolean
  controlBarButtons?: ControlBarButton[]
  participantVideoProps?: Partial<ParticipantVideoProps>
}

function Inner({ showChat, showTranscript, showParticipants, className, onLeave, controlBarButtons, participantVideoProps }: Omit<Props, 'call'>) {
  const connectionState = useConnectionState()
  const [chatOpen, setChatOpen] = useState(showChat ?? false)
  const [listOpen, setListOpen] = useState(showParticipants ?? false)
  const [transcriptOpen, setTranscriptOpen] = useState(showTranscript ?? false)

  if (connectionState === 'disconnected') {
    return (
      <div className="rtc-conference rtc-conference--disconnected">
        <p>You have left the call.</p>
      </div>
    )
  }

  if (connectionState === 'connecting' || connectionState === 'idle') {
    return (
      <div className="rtc-conference rtc-conference--connecting" aria-busy="true">
        <p>Connecting…</p>
      </div>
    )
  }

  return (
    <div className={`rtc-conference ${className ?? ''}`}>
      <ReactionsOverlay />
      <div className="rtc-conference__main">
        <VideoGrid className="rtc-conference__grid" participantVideoProps={participantVideoProps} />
        <ControlBar className="rtc-conference__controls" onLeave={onLeave} buttons={controlBarButtons} />
      </div>

      {chatOpen && <ChatPanel className="rtc-conference__chat" />}
      {listOpen && <ParticipantList className="rtc-conference__participants" />}
      {transcriptOpen && <TranscriptPanel className="rtc-conference__transcript" />}

      <div className="rtc-conference__sidebars">
        <button
          className={`rtc-conference__toggle-btn ${chatOpen ? 'rtc-conference__toggle-btn--active' : ''}`}
          onClick={() => { setChatOpen((v) => !v); setListOpen(false) }}
          aria-pressed={chatOpen}
          aria-label={chatOpen ? 'Close chat' : 'Open chat'}
        >
          💬
        </button>
        <button
          className={`rtc-conference__toggle-btn ${listOpen ? 'rtc-conference__toggle-btn--active' : ''}`}
          onClick={() => { setListOpen((v) => !v); setChatOpen(false) }}
          aria-pressed={listOpen}
          aria-label={listOpen ? 'Close participant list' : 'Open participant list'}
        >
          👥
        </button>
        <button
          className={`rtc-conference__toggle-btn ${transcriptOpen ? 'rtc-conference__toggle-btn--active' : ''}`}
          onClick={() => setTranscriptOpen((v) => !v)}
          aria-pressed={transcriptOpen}
          aria-label={transcriptOpen ? 'Close transcript' : 'Open transcript'}
        >
          📝
        </button>
      </div>
    </div>
  )
}

export function VideoConference({ call, ...rest }: Props) {
  return (
    <CallProvider call={call}>
      <Inner {...rest} />
    </CallProvider>
  )
}
