<script setup lang="ts">
import { ref } from 'vue'
import { createCall, type Call } from '@rtcstack/sdk'
import { VideoConference } from '@rtcstack/ui-vue'

const API_URL = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3000'
const API_KEY = import.meta.env['VITE_API_KEY'] ?? 'dev-key'

const call = ref<Call | null>(null)
const roomId = ref('test-room')
const name = ref('Alice')
const role = ref('host')
const error = ref<string | null>(null)
const joining = ref(false)

async function fetchToken() {
  const res = await fetch(`${API_URL}/v1/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': API_KEY },
    body: JSON.stringify({ roomId: roomId.value, userId: `user-${Date.now()}`, name: name.value, role: role.value }),
  })
  if (!res.ok) throw new Error(`Token request failed: ${res.status}`)
  return res.json() as Promise<{ token: string; url: string }>
}

async function join() {
  joining.value = true
  error.value = null
  try {
    const { token, url } = await fetchToken()
    const c = createCall({ token, url })
    await c.connect()
    call.value = c
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to join'
  } finally {
    joining.value = false
  }
}

function onLeave() {
  call.value = null
}
</script>

<template>
  <div v-if="call" style="height: 100vh">
    <VideoConference :call="call" :show-chat="true" @leave="onLeave" />
  </div>

  <div
    v-else
    style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#0f0f0f;color:#f5f5f5;font-family:system-ui;gap:16px"
  >
    <h1 style="font-size:28px;font-weight:700">RTCstack</h1>
    <p style="color:#999;margin-bottom:8px">Vue Example — drop-in video call</p>

    <div style="display:flex;flex-direction:column;gap:8px;width:300px">
      <input v-model="roomId" placeholder="Room ID" :style="inputStyle" />
      <input v-model="name" placeholder="Your name" :style="inputStyle" />
      <select v-model="role" :style="inputStyle">
        <option value="host">Host</option>
        <option value="moderator">Moderator</option>
        <option value="participant">Participant</option>
        <option value="viewer">Viewer (listen only)</option>
      </select>
      <button
        :disabled="joining || !roomId || !name"
        style="padding:12px;background:#4f9cf9;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:16px;font-weight:600"
        @click="join"
      >
        {{ joining ? 'Joining…' : 'Join Call' }}
      </button>
      <p v-if="error" style="color:#e74c3c;font-size:14px">{{ error }}</p>
    </div>
  </div>
</template>

<script lang="ts">
const inputStyle = {
  padding: '10px 12px',
  background: '#1a1a1a',
  border: '1px solid #333',
  borderRadius: '8px',
  color: '#f5f5f5',
  fontSize: '14px',
}
</script>
