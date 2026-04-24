import type { ConnectionQuality } from '@rtcstack/sdk'

interface Props {
  quality: ConnectionQuality
  className?: string
}

const BARS: Record<ConnectionQuality, { filled: number; color: string; label: string }> = {
  excellent: { filled: 3, color: '#2ecc71', label: 'Excellent' },
  good:      { filled: 2, color: '#f39c12', label: 'Good' },
  poor:      { filled: 1, color: '#e74c3c', label: 'Poor' },
  lost:      { filled: 0, color: '#e74c3c', label: 'Lost' },
  unknown:   { filled: 0, color: '#666',    label: 'Unknown' },
}

export function ConnectionQualityBadge({ quality, className }: Props) {
  const { filled, color, label } = BARS[quality]
  return (
    <span
      className={`rtc-quality-badge ${className ?? ''}`}
      aria-label={`Connection quality: ${label}`}
      title={label}
    >
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className="rtc-quality-badge__bar"
          style={{ background: n <= filled ? color : 'rgba(255,255,255,0.2)', height: `${4 + n * 3}px` }}
        />
      ))}
    </span>
  )
}
