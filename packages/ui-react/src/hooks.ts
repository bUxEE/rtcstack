import { useState, useEffect, useCallback } from 'react'
import type { Call, Participant, Message, TranscriptSegment, ConnectionState, DeviceList, Layout } from '@rtcstack/sdk'
import { useCall } from './context.js'

export function useConnectionState(): ConnectionState {
  const call = useCall()
  const [state, setState] = useState<ConnectionState>(call.connectionState)
  useEffect(() => {
    const handler = (s: ConnectionState) => setState(s)
    call.on('connectionStateChanged', handler)
    return () => { call.off('connectionStateChanged', handler) }
  }, [call])
  return state
}

export function useParticipants(): Participant[] {
  const call = useCall()
  const [participants, setParticipants] = useState<Participant[]>(() => [...call.participants.values()])

  useEffect(() => {
    const sync = () => setParticipants([...call.participants.values()])
    call.on('participantJoined', sync)
    call.on('participantLeft', sync)
    call.on('participantUpdated', sync)
    call.on('activeSpeakerChanged', sync)
    call.on('screenShareStarted', sync)
    call.on('screenShareStopped', sync)
    return () => {
      call.off('participantJoined', sync)
      call.off('participantLeft', sync)
      call.off('participantUpdated', sync)
      call.off('activeSpeakerChanged', sync)
      call.off('screenShareStarted', sync)
      call.off('screenShareStopped', sync)
    }
  }, [call])

  return participants
}

export function useLocalParticipant(): Participant | null {
  const call = useCall()
  const [local, setLocal] = useState<Participant | null>(call.localParticipant)
  useEffect(() => {
    const sync = () => setLocal(call.localParticipant)
    call.on('participantUpdated', sync)
    call.on('connectionStateChanged', sync)
    call.on('screenShareStarted', sync)
    call.on('screenShareStopped', sync)
    return () => {
      call.off('participantUpdated', sync)
      call.off('connectionStateChanged', sync)
      call.off('screenShareStarted', sync)
      call.off('screenShareStopped', sync)
    }
  }, [call])
  return local
}

export function useActiveSpeakers(): Participant[] {
  const call = useCall()
  const [speakers, setSpeakers] = useState<Participant[]>(call.activeSpeakers)
  useEffect(() => {
    const handler = (s: Participant[]) => setSpeakers(s)
    call.on('activeSpeakerChanged', handler)
    return () => { call.off('activeSpeakerChanged', handler) }
  }, [call])
  return speakers
}

export function useScreenShares(): Participant[] {
  const call = useCall()
  const [sharing, setSharing] = useState<Participant[]>(() =>
    [...call.participants.values(), ...(call.localParticipant ? [call.localParticipant] : [])]
      .filter((p) => p.isScreenSharing)
  )

  useEffect(() => {
    const sync = () => {
      const all = [...call.participants.values(), ...(call.localParticipant ? [call.localParticipant] : [])]
      setSharing(all.filter((p) => p.isScreenSharing))
    }
    call.on('screenShareStarted', sync)
    call.on('screenShareStopped', sync)
    call.on('participantUpdated', sync)
    return () => {
      call.off('screenShareStarted', sync)
      call.off('screenShareStopped', sync)
      call.off('participantUpdated', sync)
    }
  }, [call])

  return sharing
}

export function useLayout(): { layout: Layout; setLayout: (l: Layout) => void } {
  const call = useCall()
  const [layout, setLayoutState] = useState<Layout>(call.layout)
  const setLayout = useCallback((l: Layout) => {
    call.setLayout(l)
    setLayoutState(l)
  }, [call])
  return { layout, setLayout }
}

export function useIsRecording(): boolean {
  const call = useCall()
  const [recording, setRecording] = useState(false)
  useEffect(() => {
    call.on('recordingStarted', () => setRecording(true))
    call.on('recordingStopped', () => setRecording(false))
    return () => {
      call.off('recordingStarted', () => setRecording(true))
      call.off('recordingStopped', () => setRecording(false))
    }
  }, [call])
  return recording
}

export function useMessages(): Message[] {
  const call = useCall()
  const [messages, setMessages] = useState<Message[]>(call.messages)
  useEffect(() => {
    const handler = () => setMessages([...call.messages])
    call.on('messageReceived', handler)
    return () => { call.off('messageReceived', handler) }
  }, [call])
  return messages
}

export function useTranscription(): TranscriptSegment[] {
  const call = useCall()
  const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([])
  useEffect(() => {
    const handler = (segment: TranscriptSegment) => {
      setTranscripts((prev) => [...prev.slice(-499), segment])
    }
    call.on('transcriptReceived', handler)
    return () => { call.off('transcriptReceived', handler) }
  }, [call])
  return transcripts
}

export function useSpeakingIndicators(): Map<string, string> {
  const call = useCall()
  const [speaking, setSpeaking] = useState<Map<string, string>>(new Map())
  useEffect(() => {
    const onStart = (speakerId: string, speakerName: string) => {
      setSpeaking((prev) => new Map(prev).set(speakerId, speakerName))
    }
    const onStop = (speakerId: string) => {
      setSpeaking((prev) => {
        const next = new Map(prev)
        next.delete(speakerId)
        return next
      })
    }
    call.on('speakingStarted', onStart)
    call.on('speakingStopped', onStop)
    return () => {
      call.off('speakingStarted', onStart)
      call.off('speakingStopped', onStop)
    }
  }, [call])
  return speaking
}

export function useDevices(): DeviceList {
  const call = useCall()
  const [devices, setDevices] = useState<DeviceList>(call.devices)
  useEffect(() => {
    const handler = (d: DeviceList) => setDevices(d)
    call.on('devicesChanged', handler)
    return () => { call.off('devicesChanged', handler) }
  }, [call])
  return devices
}

export function useMediaControls() {
  const call = useCall()
  return {
    toggleMic: useCallback(() => call.toggleMic(), [call]),
    toggleCamera: useCallback(() => call.toggleCamera(), [call]),
    startScreenShare: useCallback(() => call.startScreenShare(), [call]),
    stopScreenShare: useCallback(() => call.stopScreenShare(), [call]),
    toggleScreenShare: useCallback(() =>
      call.isScreenSharing() ? call.stopScreenShare() : call.startScreenShare(), [call]),
    sendMessage: useCallback((text: string, opts?: { to?: string[] }) => call.sendMessage(text, opts), [call]),
    sendReaction: useCallback((emoji: string) => call.sendReaction(emoji), [call]),
    setLayout: useCallback((l: Layout) => call.setLayout(l), [call]),
    pin: useCallback((id: string | null) => call.pin(id), [call]),
    switchDevice: useCallback((k: 'audioinput' | 'audiooutput' | 'videoinput', id: string) => call.switchDevice(k, id), [call]),
    disconnect: useCallback(() => call.disconnect(), [call]),
  }
}
