import { useParticipants, useLocalParticipant, useScreenShares, useLayout } from '../hooks.js'
import { ParticipantVideo } from './ParticipantVideo.js'
import type { ParticipantVideoProps } from './ParticipantVideo.js'
import { useMediaControls } from '../hooks.js'

interface Props {
  className?: string
  participantVideoProps?: Partial<ParticipantVideoProps>
}

export function VideoGrid({ className, participantVideoProps }: Props) {
  const remote = useParticipants()
  const local = useLocalParticipant()
  const screenShares = useScreenShares()
  const { layout } = useLayout()
  const { pin } = useMediaControls()

  const allParticipants = local ? [local, ...remote] : remote
  const count = allParticipants.length

  const gridClass = count <= 1 ? 'rtc-grid--1'
    : count <= 2 ? 'rtc-grid--2'
    : count <= 4 ? 'rtc-grid--4'
    : count <= 9 ? 'rtc-grid--9'
    : 'rtc-grid--many'

  const tileProps = participantVideoProps ?? {}

  if (layout === 'spotlight' && screenShares.length > 0) {
    const featured = screenShares[0]!
    const rest = allParticipants.filter((p) => p.id !== featured.id)
    return (
      <div className={`rtc-video-grid rtc-layout--spotlight ${className ?? ''}`} role="list" aria-label="Participants">
        <div className="rtc-spotlight__main" role="listitem">
          <ParticipantVideo participant={featured} isScreenShare {...tileProps} />
        </div>
        <div className="rtc-spotlight__strip">
          {rest.map((p) => (
            <div key={p.id} role="listitem" className="rtc-spotlight__thumb">
              <ParticipantVideo participant={p} onClick={() => pin(p.id)} {...tileProps} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (screenShares.length > 0) {
    const featured = screenShares[0]!
    const rest = allParticipants
    return (
      <div className={`rtc-video-grid rtc-layout--screenshare ${className ?? ''}`} role="list" aria-label="Participants">
        <div className="rtc-screenshare__main" role="listitem">
          <ParticipantVideo participant={featured} isScreenShare {...tileProps} />
        </div>
        <div className="rtc-screenshare__strip">
          {rest.map((p) => (
            <div key={p.id} role="listitem" className="rtc-screenshare__thumb">
              <ParticipantVideo participant={p} {...tileProps} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`rtc-video-grid ${gridClass} ${className ?? ''}`} role="list" aria-label="Participants">
      {allParticipants.map((p) => (
        <div key={p.id} role="listitem">
          <ParticipantVideo participant={p} onClick={() => pin(p.id)} {...tileProps} />
        </div>
      ))}
    </div>
  )
}
