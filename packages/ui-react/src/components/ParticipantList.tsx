import { useParticipants, useLocalParticipant } from '../hooks.js'
import { ConnectionQualityBadge } from './ConnectionQualityBadge.js'

interface Props {
  className?: string
}

export function ParticipantList({ className }: Props) {
  const remote = useParticipants()
  const local = useLocalParticipant()
  const all = local ? [local, ...remote] : remote

  return (
    <div className={`rtc-participant-list ${className ?? ''}`} role="list" aria-label="Participants in call">
      <div className="rtc-participant-list__header">
        Participants ({all.length})
      </div>
      {all.map((p) => (
        <div key={p.id} className="rtc-participant-list__item" role="listitem">
          <div className="rtc-participant-list__avatar">
            {p.name.charAt(0).toUpperCase()}
          </div>
          <div className="rtc-participant-list__info">
            <span className="rtc-participant-list__name">
              {p.name}
              {p.isLocal && <span className="rtc-participant-list__you"> (you)</span>}
            </span>
            <span className="rtc-participant-list__role">{p.role}</span>
          </div>
          <div className="rtc-participant-list__status">
            {p.isSpeaking && <span aria-label="Speaking">🎙</span>}
            {p.isMuted && <span aria-label="Muted">🔇</span>}
            {p.isCameraOff && <span aria-label="Camera off">📷</span>}
            {p.isScreenSharing && <span aria-label="Screen sharing">🖥</span>}
            <ConnectionQualityBadge quality={p.connectionQuality} />
          </div>
        </div>
      ))}
    </div>
  )
}
