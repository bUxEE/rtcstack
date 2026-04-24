import { createCall } from '@rtcstack/sdk'
import { mountVideoConference } from '@rtcstack/ui-vanilla'

const API_URL = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3000'
const API_KEY = import.meta.env['VITE_API_KEY'] ?? 'dev-key'

const joinScreen = document.getElementById('join-screen')!
const callScreen = document.getElementById('call-screen')!
const joinBtn = document.getElementById('join-btn') as HTMLButtonElement
const errorEl = document.getElementById('error')!

async function fetchToken(roomId: string, userId: string, name: string, role: string) {
  const res = await fetch(`${API_URL}/v1/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': API_KEY },
    body: JSON.stringify({ roomId, userId, name, role }),
  })
  if (!res.ok) throw new Error(`Token request failed: ${res.status}`)
  return res.json() as Promise<{ token: string; url: string }>
}

joinBtn.addEventListener('click', async () => {
  const roomId = (document.getElementById('room-id') as HTMLInputElement).value.trim()
  const name = (document.getElementById('name') as HTMLInputElement).value.trim()
  const role = (document.getElementById('role') as HTMLSelectElement).value

  if (!roomId || !name) return

  joinBtn.disabled = true
  joinBtn.textContent = 'Joining…'
  errorEl.textContent = ''

  try {
    const { token, url } = await fetchToken(roomId, `user-${Date.now()}`, name, role)
    const call = createCall({ token, url })
    await call.connect()

    joinScreen.style.display = 'none'
    callScreen.style.display = 'block'

    const { unmount } = mountVideoConference(callScreen, { call })

    call.on('disconnected', () => {
      unmount()
      callScreen.style.display = 'none'
      joinScreen.style.display = 'flex'
      joinBtn.disabled = false
      joinBtn.textContent = 'Join Call'
    })
  } catch (err) {
    errorEl.textContent = err instanceof Error ? err.message : 'Failed to join'
    joinBtn.disabled = false
    joinBtn.textContent = 'Join Call'
  }
})
