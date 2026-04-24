import { useState } from 'react'
import { createCall } from '@rtcstack/sdk'
import { VideoConference } from '@rtcstack/ui-react'
import '@rtcstack/ui-react/styles.css'
import type { Call } from '@rtcstack/sdk'

const API_URL = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3000'

async function fetchToken(roomId: string, userId: string, name: string, role: string) {
  const res = await fetch(`${API_URL}/v1/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': import.meta.env['VITE_API_KEY'] ?? 'dev-key',
    },
    body: JSON.stringify({ roomId, userId, name, role }),
  })
  if (!res.ok) throw new Error(`Token request failed: ${res.status}`)
  return res.json() as Promise<{ token: string; url: string }>
}

export default function App() {
  const [call, setCall] = useState<Call | null>(null)
  const [roomId, setRoomId] = useState('test-room')
  const [name, setName] = useState('Alice')
  const [role, setRole] = useState('host')
  const [error, setError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)

  const handleJoin = async () => {
    setJoining(true)
    setError(null)
    try {
      const { token, url } = await fetchToken(roomId, `user-${Date.now()}`, name, role)
      const c = createCall({ token, url })
      await c.connect()
      setCall(c)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join')
    } finally {
      setJoining(false)
    }
  }

  if (call) {
    return (
      <div style={{ height: '100vh' }}>
        <VideoConference
          call={call}
          showChat
          onLeave={() => setCall(null)}
        />
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#0f0f0f',
      color: '#f5f5f5',
      fontFamily: 'system-ui',
      gap: 16,
    }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>RTCstack</h1>
      <p style={{ color: '#999', marginBottom: 8 }}>React Example — drop-in video call</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 300 }}>
        <input
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          placeholder="Room ID"
          style={inputStyle}
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          style={inputStyle}
        />
        <select value={role} onChange={(e) => setRole(e.target.value)} style={inputStyle}>
          <option value="host">Host</option>
          <option value="moderator">Moderator</option>
          <option value="participant">Participant</option>
          <option value="viewer">Viewer (listen only)</option>
        </select>
        <button
          onClick={handleJoin}
          disabled={joining || !roomId || !name}
          style={{
            padding: '12px',
            background: '#4f9cf9',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          {joining ? 'Joining…' : 'Join Call'}
        </button>
        {error && <p style={{ color: '#e74c3c', fontSize: 14 }}>{error}</p>}
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  background: '#1a1a1a',
  border: '1px solid #333',
  borderRadius: 8,
  color: '#f5f5f5',
  fontSize: 14,
}
