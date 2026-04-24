# @rtcstack/ui-vanilla

Zero-dependency vanilla JavaScript UI for RTCstack. No framework required — mounts a full conference UI into any `HTMLElement`.

## Install

```bash
npm install @rtcstack/ui-vanilla @rtcstack/sdk livekit-client
```

## Quick start

```typescript
import { createCall } from '@rtcstack/sdk'
import { mountVideoConference } from '@rtcstack/ui-vanilla'

const call = createCall({ url: 'wss://...', token: '...' })
await call.connect()

const { unmount } = mountVideoConference(document.getElementById('app')!, { call })

// Later:
unmount()
```

## `mountVideoConference(container, options)`

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `container` | `HTMLElement` | DOM element to mount into. Its contents will be replaced. |
| `options` | `MountOptions` | Configuration (see below) |

### `MountOptions`

```typescript
interface MountOptions {
  call: Call

  /** Layout mode. Default: 'grid' */
  layout?: 'grid' | 'speaker'

  /** Show the live transcript overlay. Default: true */
  showTranscript?: boolean

  /**
   * Which control buttons to render.
   * Default: ['mic', 'camera', 'screenshare', 'reactions', 'devices', 'leave']
   */
  buttons?: VanillaButton[]

  /** Called when the user clicks Leave and disconnect() resolves. */
  onLeave?: () => void

  /** Per-tile display options */
  participantTile?: {
    showSpeakingIndicator?: boolean  // default true
    showMuteIndicator?: boolean      // default true
    showQualityBadge?: boolean       // default true
    showName?: boolean               // default true
    objectFit?: 'cover' | 'contain'  // default 'cover'
  }
}

type VanillaButton = 'mic' | 'camera' | 'screenshare' | 'reactions' | 'devices' | 'leave'
```

### Return value

```typescript
{ unmount: () => void }
```

`unmount()` removes all event listeners, clears internal state, and empties the container.

## Examples

### Minimal (mic + leave only)
```typescript
mountVideoConference(el, {
  call,
  buttons: ['mic', 'leave'],
  showTranscript: false,
})
```

### Speaker layout, contain fit
```typescript
mountVideoConference(el, {
  call,
  layout: 'speaker',
  participantTile: { objectFit: 'contain', showQualityBadge: false },
})
```

### With leave callback
```typescript
const { unmount } = mountVideoConference(el, {
  call,
  onLeave: () => { unmount(); window.location.href = '/bye' },
})
```

## Transcript overlay

When `showTranscript: true` (default), a floating panel appears in the bottom-left corner showing:
- An animated `···` indicator when a speaker is detected (before Whisper returns)
- Final transcribed text when available
- Segments auto-expire after 8 seconds of inactivity
- Adjacent segments from the same speaker merge within 5 seconds

Requires the RTCstack STT service to be running and connected to the room.

## License

MIT
