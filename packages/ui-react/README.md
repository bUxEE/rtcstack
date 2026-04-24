# @rtcstack/ui-react

React component library for RTCstack. Provides a full `VideoConference` experience and every individual component usable standalone.

## Install

```bash
npm install @rtcstack/ui-react @rtcstack/sdk livekit-client react react-dom
```

## Quick start — full conference UI

```tsx
import { createCall } from '@rtcstack/sdk'
import { VideoConference } from '@rtcstack/ui-react'
import '@rtcstack/ui-react/styles.css'

const call = createCall({ url: 'wss://...', token: '...' })
await call.connect()

function App() {
  return (
    <VideoConference
      call={call}
      onLeave={() => console.log('left')}
    />
  )
}
```

## Components

### `VideoConference`

Full conference view: video grid + control bar + sidebars.

```tsx
<VideoConference
  call={call}
  className="my-conference"
  onLeave={handleLeave}
  showChat={false}               // default false
  showTranscript={false}         // default false
  showParticipants={false}       // default false
  controlBarButtons={['mic', 'camera', 'leave']}  // subset of buttons
  participantVideoProps={{
    showSpeakingIndicator: true,
    showMuteIndicator: true,
    objectFit: 'contain',
  }}
/>
```

---

### `ControlBar`

The row of call control buttons.

```tsx
<ControlBar
  onLeave={handleLeave}
  buttons={['mic', 'camera', 'screenshare', 'devices', 'leave']}
/>
```

**`buttons` values:** `'mic' | 'camera' | 'screenshare' | 'reactions' | 'layout' | 'devices' | 'leave'`

Default: all buttons in that order.

---

### `ParticipantVideo`

Single participant tile with video, audio, and status overlays.

```tsx
<ParticipantVideo
  participant={participant}
  isScreenShare={false}         // default false
  showSpeakingIndicator={true}  // default true
  showMuteIndicator={true}      // default true
  showQualityBadge={true}       // default true
  showName={true}               // default true
  mirror={undefined}            // default: true for local non-screenshare
  objectFit="cover"             // 'cover' | 'contain', default 'cover'
  onClick={handleClick}
/>
```

---

### `TranscriptPanel`

Live transcript with speaking indicator (animated `···`) and final text.

```tsx
<TranscriptPanel
  maxItems={100}            // default 100, 0 = unlimited
  showSpeakerName={true}    // default true
  className="my-transcript"
/>
```

Must be inside a `CallProvider`. Listens to `transcriptReceived` and `speakingStarted`/`speakingStopped` events.

---

### `VideoGrid`

Responsive grid of all participant tiles.

```tsx
<VideoGrid
  className="my-grid"
  participantVideoProps={{ objectFit: 'contain', showQualityBadge: false }}
/>
```

Switches to screenshare layout automatically when someone shares.

---

### `ChatPanel`

Scrollable chat message list with input field.

```tsx
<ChatPanel className="my-chat" />
```

---

### `ParticipantList`

List of all participants with status icons.

```tsx
<ParticipantList className="my-list" />
```

---

### `DeviceSelector`

Dropdown to select microphone, speaker, and camera.

```tsx
<DeviceSelector className="my-devices" />
```

---

### `ConnectionQualityBadge`

Three-bar signal quality badge.

```tsx
<ConnectionQualityBadge quality={participant.connectionQuality} />
```

---

## Hooks

All hooks must be used inside a `CallProvider` (or inside `VideoConference` which wraps one).

```tsx
import { CallProvider } from '@rtcstack/ui-react'

<CallProvider call={call}>
  <YourComponent />
</CallProvider>
```

| Hook | Returns | Description |
|------|---------|-------------|
| `useCall()` | `Call` | Access the `Call` instance |
| `useConnectionState()` | `ConnectionState` | Current connection state |
| `useParticipants()` | `Participant[]` | All remote participants, live |
| `useLocalParticipant()` | `Participant \| null` | Local participant, live |
| `useActiveSpeakers()` | `Participant[]` | Currently speaking participants |
| `useScreenShares()` | `Participant[]` | Participants currently screen sharing |
| `useLayout()` | `{ layout, setLayout }` | Current layout + setter |
| `useIsRecording()` | `boolean` | Whether room is being recorded |
| `useMessages()` | `Message[]` | Chat messages, live |
| `useTranscription()` | `TranscriptSegment[]` | Transcript segments, live |
| `useSpeakingIndicators()` | `Map<string, string>` | Map of speakerId → speakerName for currently speaking (pre-transcript) |
| `useDevices()` | `DeviceList` | Available devices |
| `useMediaControls()` | `{ toggleMic, toggleCamera, startScreenShare, stopScreenShare, toggleScreenShare, sendMessage, sendReaction, setLayout, pin, switchDevice, disconnect }` | All media control actions |

## License

MIT
