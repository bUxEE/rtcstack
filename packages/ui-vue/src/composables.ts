import { ref, computed, onMounted, onUnmounted, inject, type Ref } from 'vue'
import type { Call, Participant, Message, TranscriptSegment, ConnectionState, DeviceList, Layout } from '@rtcstack/sdk'

export const CALL_KEY = Symbol('rtcstack-call')

export function useCall(): Call {
  const call = inject<Call>(CALL_KEY)
  if (!call) throw new Error('useCall must be used inside a component with call provided via CALL_KEY')
  return call
}

export function useConnectionState(): Ref<ConnectionState> {
  const call = useCall()
  const state = ref<ConnectionState>(call.connectionState)
  const handler = (s: ConnectionState) => { state.value = s }
  onMounted(() => call.on('connectionStateChanged', handler))
  onUnmounted(() => call.off('connectionStateChanged', handler))
  return state
}

export function useParticipants(): Ref<Participant[]> {
  const call = useCall()
  const participants = ref<Participant[]>([...call.participants.values()])
  const sync = () => { participants.value = [...call.participants.values()] }
  onMounted(() => {
    call.on('participantJoined', sync)
    call.on('participantLeft', sync)
    call.on('participantUpdated', sync)
    call.on('activeSpeakerChanged', sync)
    call.on('screenShareStarted', sync)
    call.on('screenShareStopped', sync)
  })
  onUnmounted(() => {
    call.off('participantJoined', sync)
    call.off('participantLeft', sync)
    call.off('participantUpdated', sync)
    call.off('activeSpeakerChanged', sync)
    call.off('screenShareStarted', sync)
    call.off('screenShareStopped', sync)
  })
  return participants
}

export function useLocalParticipant(): Ref<Participant | null> {
  const call = useCall()
  const local = ref<Participant | null>(call.localParticipant)
  const sync = () => { local.value = call.localParticipant }
  onMounted(() => {
    call.on('participantUpdated', sync)
    call.on('connectionStateChanged', sync)
    call.on('screenShareStarted', sync)
    call.on('screenShareStopped', sync)
  })
  onUnmounted(() => {
    call.off('participantUpdated', sync)
    call.off('connectionStateChanged', sync)
    call.off('screenShareStarted', sync)
    call.off('screenShareStopped', sync)
  })
  return local
}

export function useActiveSpeakers(): Ref<Participant[]> {
  const call = useCall()
  const speakers = ref<Participant[]>(call.activeSpeakers)
  const handler = (s: Participant[]) => { speakers.value = s }
  onMounted(() => call.on('activeSpeakerChanged', handler))
  onUnmounted(() => call.off('activeSpeakerChanged', handler))
  return speakers
}

export function useScreenShares(): Ref<Participant[]> {
  const call = useCall()
  const allFn = () => {
    const all = [...call.participants.values(), ...(call.localParticipant ? [call.localParticipant] : [])]
    return all.filter((p) => p.isScreenSharing)
  }
  const sharing = ref<Participant[]>(allFn())
  const sync = () => { sharing.value = allFn() }
  onMounted(() => {
    call.on('screenShareStarted', sync)
    call.on('screenShareStopped', sync)
    call.on('participantUpdated', sync)
  })
  onUnmounted(() => {
    call.off('screenShareStarted', sync)
    call.off('screenShareStopped', sync)
    call.off('participantUpdated', sync)
  })
  return sharing
}

export function useLayout(): { layout: Ref<Layout>; setLayout: (l: Layout) => void } {
  const call = useCall()
  const layout = ref<Layout>(call.layout)
  const setLayout = (l: Layout) => {
    call.setLayout(l)
    layout.value = l
  }
  return { layout, setLayout }
}

export function useIsRecording(): Ref<boolean> {
  const call = useCall()
  const recording = ref(false)
  onMounted(() => {
    call.on('recordingStarted', () => { recording.value = true })
    call.on('recordingStopped', () => { recording.value = false })
  })
  onUnmounted(() => {
    call.off('recordingStarted', () => { recording.value = true })
    call.off('recordingStopped', () => { recording.value = false })
  })
  return recording
}

export function useMessages(): Ref<Message[]> {
  const call = useCall()
  const messages = ref<Message[]>([...call.messages])
  const handler = () => { messages.value = [...call.messages] }
  onMounted(() => call.on('messageReceived', handler))
  onUnmounted(() => call.off('messageReceived', handler))
  return messages
}

export function useTranscription(): Ref<TranscriptSegment[]> {
  const call = useCall()
  const transcripts = ref<TranscriptSegment[]>([])
  const handler = (segment: TranscriptSegment) => {
    transcripts.value = [...transcripts.value.slice(-499), segment]
  }
  onMounted(() => call.on('transcriptReceived', handler))
  onUnmounted(() => call.off('transcriptReceived', handler))
  return transcripts
}

export function useSpeakingIndicators(): Ref<Map<string, string>> {
  const call = useCall()
  const speaking = ref<Map<string, string>>(new Map())
  const onStart = (speakerId: string, speakerName: string) => {
    speaking.value = new Map(speaking.value).set(speakerId, speakerName)
  }
  const onStop = (speakerId: string) => {
    const next = new Map(speaking.value)
    next.delete(speakerId)
    speaking.value = next
  }
  onMounted(() => {
    call.on('speakingStarted', onStart)
    call.on('speakingStopped', onStop)
  })
  onUnmounted(() => {
    call.off('speakingStarted', onStart)
    call.off('speakingStopped', onStop)
  })
  return speaking
}

export function useDevices(): Ref<DeviceList> {
  const call = useCall()
  const devices = ref<DeviceList>(call.devices)
  const handler = (d: DeviceList) => { devices.value = d }
  onMounted(() => call.on('devicesChanged', handler))
  onUnmounted(() => call.off('devicesChanged', handler))
  return devices
}
