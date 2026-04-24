import { useEffect, useRef } from 'react'
import type { Participant } from '@rtcstack/sdk'
import { ConnectionQualityBadge } from './ConnectionQualityBadge.js'

export interface ParticipantVideoProps {
  participant: Participant
  isScreenShare?: boolean
  className?: string
  onClick?: () => void
  showSpeakingIndicator?: boolean
  showMuteIndicator?: boolean
  showQualityBadge?: boolean
  showName?: boolean
  mirror?: boolean
  objectFit?: 'cover' | 'contain'
}

export function ParticipantVideo({
  participant,
  isScreenShare = false,
  className,
  onClick,
  showSpeakingIndicator = true,
  showMuteIndicator = true,
  showQualityBadge = true,
  showName = true,
  mirror,
  objectFit = 'cover',
}: ParticipantVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  const track = isScreenShare ? participant.screenShareTrack : participant.videoTrack
  const shouldMirror = mirror ?? (!isScreenShare && participant.isLocal)

  useEffect(() => {
    if (videoRef.current && track) {
      videoRef.current.srcObject = new MediaStream([track])
    } else if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [track])

  useEffect(() => {
    if (audioRef.current && participant.audioTrack && !participant.isLocal) {
      audioRef.current.srcObject = new MediaStream([participant.audioTrack])
      audioRef.current.play().catch(() => {})
    }
  }, [participant.audioTrack, participant.isLocal])

  const hasVideo = !!track
  const showAvatar = !hasVideo && !isScreenShare

  return (
    <div
      className={[
        'rtc-participant-tile',
        participant.isSpeaking && !isScreenShare ? 'rtc-participant-tile--speaking' : '',
        isScreenShare ? 'rtc-participant-tile--screenshare' : '',
        className ?? '',
      ].join(' ').trim()}
      data-participant-id={participant.id}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={[
          'rtc-participant-tile__video',
          shouldMirror ? 'rtc-participant-tile__video--mirrored' : '',
          !hasVideo ? 'rtc-participant-tile__video--hidden' : '',
        ].join(' ').trim()}
        style={{ objectFit }}
      />
      {!participant.isLocal && !isScreenShare && (
        <audio ref={audioRef} autoPlay playsInline />
      )}

      {showAvatar && (
        <div className="rtc-participant-tile__avatar" aria-hidden="true">
          <span className="rtc-participant-tile__initials">
            {participant.name.charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      {(showName || showSpeakingIndicator || showMuteIndicator || showQualityBadge) && (
        <div className="rtc-participant-tile__info">
          {showName && (
            <span className="rtc-participant-tile__name">
              {isScreenShare ? `${participant.name}'s screen` : participant.name}
            </span>
          )}
          {!isScreenShare && showSpeakingIndicator && participant.isSpeaking && (
            <span className="rtc-participant-tile__speaking-icon" aria-label="Speaking">
              🎙
            </span>
          )}
          {!isScreenShare && showMuteIndicator && participant.isMuted && (
            <span className="rtc-participant-tile__muted" aria-label="Muted">
              🔇
            </span>
          )}
          {!isScreenShare && showQualityBadge && (
            <ConnectionQualityBadge quality={participant.connectionQuality} />
          )}
        </div>
      )}

      {participant.isScreenSharing && !isScreenShare && (
        <span className="rtc-participant-tile__screen-badge" aria-label="Screen sharing">
          🖥
        </span>
      )}
    </div>
  )
}
