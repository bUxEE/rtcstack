import { useEffect, useRef } from 'react'
import { useTranscription, useSpeakingIndicators } from '../hooks.js'

interface Props {
  className?: string
  maxItems?: number
  showSpeakerName?: boolean
}

export function TranscriptPanel({ className, maxItems = 100, showSpeakerName = true }: Props) {
  const segments = useTranscription()
  const speaking = useSpeakingIndicators()
  const bottomRef = useRef<HTMLDivElement>(null)

  const visible = maxItems > 0 ? segments.slice(-maxItems) : segments

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [segments.length, speaking.size])

  return (
    <div className={`rtc-transcript-panel ${className ?? ''}`} role="log" aria-live="polite" aria-label="Live transcript">
      {visible.map((seg, i) => (
        <div key={i} className="rtc-transcript-panel__entry">
          {showSpeakerName && (
            <span className="rtc-transcript-panel__speaker">{seg.speaker}</span>
          )}
          <span className="rtc-transcript-panel__text">{seg.text}</span>
        </div>
      ))}
      {[...speaking.entries()].map(([id, name]) => (
        <div key={`interim-${id}`} className="rtc-transcript-panel__entry rtc-transcript-panel__entry--interim">
          {showSpeakerName && (
            <span className="rtc-transcript-panel__speaker">{name}</span>
          )}
          <span className="rtc-transcript-panel__text rtc-transcript-panel__text--interim" aria-label="Speaking">···</span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
