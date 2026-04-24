# @rtcstack/ui-vue

Vue 3 component library for RTCstack. Provides a full `VideoConference` experience and every individual component usable standalone.

## Install

```bash
npm install @rtcstack/ui-vue @rtcstack/sdk livekit-client vue
```

## Quick start — full conference UI

```vue
<script setup lang="ts">
import { createCall } from '@rtcstack/sdk'
import { VideoConference } from '@rtcstack/ui-vue'
import '@rtcstack/ui-vue/styles.css'

const call = createCall({ url: 'wss://...', token: '...' })
await call.connect()
</script>

<template>
  <VideoConference :call="call" @leave="handleLeave" />
</template>
```

## Components

### `VideoConference`

Full conference view: video grid + control bar + sidebars.

```vue
<VideoConference
  :call="call"
  class="my-conference"
  :show-chat="false"
  :show-transcript="false"
  :show-participants="false"
  :control-bar-buttons="['mic', 'camera', 'leave']"
  :participant-video-props="{ showSpeakingIndicator: true, objectFit: 'contain' }"
  @leave="handleLeave"
/>
```

---

### `ControlBar`

The row of call control buttons.

```vue
<ControlBar
  :buttons="['mic', 'camera', 'screenshare', 'devices', 'leave']"
  @leave="handleLeave"
/>
```

**`buttons` values:** `'mic' | 'camera' | 'screenshare' | 'reactions' | 'layout' | 'devices' | 'leave'`

Default: all buttons in that order.

---

### `ParticipantVideo`

Single participant tile.

```vue
<ParticipantVideo
  :participant="participant"
  :is-screen-share="false"
  :show-speaking-indicator="true"
  :show-mute-indicator="true"
  :show-quality-badge="true"
  :show-name="true"
  object-fit="cover"
  @click="handleClick"
/>
```

---

### `TranscriptPanel`

Live transcript with speaking indicators.

```vue
<TranscriptPanel
  :max-items="100"
  :show-speaker-name="true"
  class="my-transcript"
/>
```

---

### `VideoGrid`

Responsive grid of participant tiles.

```vue
<VideoGrid
  class="my-grid"
  :participant-video-props="{ objectFit: 'contain' }"
/>
```

---

### `ChatPanel`

```vue
<ChatPanel class="my-chat" />
```

---

### `ParticipantList`

```vue
<ParticipantList class="my-list" />
```

---

### `DeviceSelector`

```vue
<DeviceSelector class="my-devices" />
```

---

## Composables

All composables must be used inside a component where `CALL_KEY` has been provided (via `provide(CALL_KEY, call)` or inside `VideoConference`).

```vue
<script setup lang="ts">
import { provide } from 'vue'
import { CALL_KEY } from '@rtcstack/ui-vue'

provide(CALL_KEY, call)
</script>
```

| Composable | Returns | Description |
|-----------|---------|-------------|
| `useCall()` | `Call` | Access the `Call` instance |
| `useConnectionState()` | `Ref<ConnectionState>` | Current connection state |
| `useParticipants()` | `Ref<Participant[]>` | All remote participants, live |
| `useLocalParticipant()` | `Ref<Participant \| null>` | Local participant, live |
| `useActiveSpeakers()` | `Ref<Participant[]>` | Currently speaking participants |
| `useScreenShares()` | `Ref<Participant[]>` | Participants screen sharing |
| `useLayout()` | `{ layout: Ref<Layout>, setLayout }` | Layout state + setter |
| `useIsRecording()` | `Ref<boolean>` | Recording state |
| `useMessages()` | `Ref<Message[]>` | Chat messages, live |
| `useTranscription()` | `Ref<TranscriptSegment[]>` | Transcript segments, live |
| `useSpeakingIndicators()` | `Ref<Map<string, string>>` | speakerId → speakerName while speaking |
| `useDevices()` | `Ref<DeviceList>` | Available devices |

## License

MIT
