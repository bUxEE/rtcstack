export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

export type ParticipantRole = 'host' | 'moderator' | 'participant' | 'viewer'

export type ConnectionQuality = 'excellent' | 'good' | 'poor' | 'lost' | 'unknown'

export type Layout = 'grid' | 'speaker' | 'spotlight'

export interface Participant {
  id: string
  name: string
  role: ParticipantRole
  isMuted: boolean
  isCameraOff: boolean
  isSpeaking: boolean
  connectionQuality: ConnectionQuality
  videoTrack: MediaStreamTrack | null
  audioTrack: MediaStreamTrack | null
  screenShareTrack: MediaStreamTrack | null
  isScreenSharing: boolean
  isLocal: boolean
  metadata: Record<string, unknown>
}

export interface Message {
  id: string
  from: string
  fromName: string
  text: string
  timestamp: Date
  to: string[] | null
}

export interface TranscriptSegment {
  text: string
  speaker: string
  speakerId: string
  timestamp: Date
  startMs?: number
}

export interface DeviceList {
  audioinput: MediaDeviceInfo[]
  audiooutput: MediaDeviceInfo[]
  videoinput: MediaDeviceInfo[]
}

export interface CallOptions {
  token: string
  url: string
  tokenRefresher?: () => Promise<string>
  onAnalyticsEvent?: (event: string, data: Record<string, unknown>) => void
  /** Base URL of the RTCstack API (e.g. "https://api.yourapp.com"). Required for recording/transcription proxy methods. */
  apiUrl?: string
  /** Room name — required for recording/transcription proxy methods. */
  roomName?: string
}

export type CallEventMap = {
  connectionStateChanged: [state: ConnectionState]
  participantJoined: [participant: Participant]
  participantLeft: [participant: Participant]
  participantUpdated: [participant: Participant]
  activeSpeakerChanged: [speakers: Participant[]]
  screenShareStarted: [participant: Participant]
  screenShareStopped: [participantId: string]
  recordingStarted: []
  recordingStopped: []
  messageReceived: [message: Message]
  reactionReceived: [from: string, emoji: string]
  transcriptReceived: [segment: TranscriptSegment]
  speakingStarted: [speakerId: string, speakerName: string]
  speakingStopped: [speakerId: string]
  reconnecting: [attempt: number]
  reconnected: []
  disconnected: [reason?: string]
  tokenExpired: []
  audioPlaybackBlocked: []
  callSuspended: []
  permissionDenied: [kind: 'audioinput' | 'videoinput']
  devicesChanged: [devices: DeviceList]
  error: [error: Error]
}
