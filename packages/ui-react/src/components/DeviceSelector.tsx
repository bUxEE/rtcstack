import { useState, useEffect } from 'react'
import { useDevices, useMediaControls } from '../hooks.js'

type DeviceKind = 'audioinput' | 'audiooutput' | 'videoinput'

interface GroupProps {
  label: string
  icon: string
  devices: MediaDeviceInfo[]
  selected: string
  onChange: (id: string) => void
}

function DeviceGroup({ label, icon, devices, selected, onChange }: GroupProps) {
  if (devices.length === 0) return null
  return (
    <div className="rtc-device-selector__group">
      <label className="rtc-device-selector__label">
        <span className="rtc-device-selector__icon">{icon}</span>
        {label}
      </label>
      <select
        className="rtc-device-selector__select"
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`Select ${label}`}
      >
        {devices.map((d) => (
          <option key={d.deviceId} value={d.deviceId}>
            {d.label || `${label} ${devices.indexOf(d) + 1}`}
          </option>
        ))}
      </select>
    </div>
  )
}

interface Props {
  className?: string
}

export function DeviceSelector({ className }: Props) {
  const devices = useDevices()
  const { switchDevice } = useMediaControls()
  const [selected, setSelected] = useState<Record<DeviceKind, string>>({
    audioinput: '',
    audiooutput: '',
    videoinput: '',
  })

  // Seed initial selection from first device in each list
  useEffect(() => {
    setSelected((prev) => ({
      audioinput: prev.audioinput || devices.audioinput[0]?.deviceId || '',
      audiooutput: prev.audiooutput || devices.audiooutput[0]?.deviceId || '',
      videoinput: prev.videoinput || devices.videoinput[0]?.deviceId || '',
    }))
  }, [devices])

  function handleChange(kind: DeviceKind, deviceId: string) {
    setSelected((prev) => ({ ...prev, [kind]: deviceId }))
    void switchDevice(kind, deviceId)
  }

  return (
    <div className={`rtc-device-selector ${className ?? ''}`} role="dialog" aria-label="Device settings">
      <div className="rtc-device-selector__header">Device Settings</div>
      <DeviceGroup
        label="Microphone"
        icon="🎤"
        devices={devices.audioinput}
        selected={selected.audioinput}
        onChange={(id) => handleChange('audioinput', id)}
      />
      <DeviceGroup
        label="Speaker"
        icon="🔊"
        devices={devices.audiooutput}
        selected={selected.audiooutput}
        onChange={(id) => handleChange('audiooutput', id)}
      />
      <DeviceGroup
        label="Camera"
        icon="📷"
        devices={devices.videoinput}
        selected={selected.videoinput}
        onChange={(id) => handleChange('videoinput', id)}
      />
    </div>
  )
}
