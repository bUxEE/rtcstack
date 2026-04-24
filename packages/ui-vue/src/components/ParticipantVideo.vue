<script setup lang="ts">
import { ref, watchEffect, computed, onUnmounted } from 'vue'
import type { Participant } from '@rtcstack/sdk'

const props = withDefaults(defineProps<{
  participant: Participant
  isScreenShare?: boolean
  showSpeakingIndicator?: boolean
  showMuteIndicator?: boolean
  showQualityBadge?: boolean
  showName?: boolean
  mirror?: boolean
  objectFit?: 'cover' | 'contain'
}>(), {
  isScreenShare: false,
  showSpeakingIndicator: true,
  showMuteIndicator: true,
  showQualityBadge: true,
  showName: true,
  objectFit: 'cover',
})

const emit = defineEmits<{ click: [] }>()

const videoRef = ref<HTMLVideoElement | null>(null)
const audioRef = ref<HTMLAudioElement | null>(null)

watchEffect(() => {
  const track = props.isScreenShare ? props.participant.screenShareTrack : props.participant.videoTrack
  if (videoRef.value && track) {
    videoRef.value.srcObject = new MediaStream([track])
  } else if (videoRef.value) {
    videoRef.value.srcObject = null
  }
})

watchEffect(() => {
  if (audioRef.value && props.participant.audioTrack && !props.participant.isLocal) {
    audioRef.value.srcObject = new MediaStream([props.participant.audioTrack])
    audioRef.value.play().catch(() => {})
  }
})

onUnmounted(() => {
  if (videoRef.value) videoRef.value.srcObject = null
  if (audioRef.value) audioRef.value.srcObject = null
})

const QUALITY_MAP: Record<string, { bars: number; color: string }> = {
  excellent: { bars: 3, color: '#2ecc71' },
  good:      { bars: 2, color: '#f39c12' },
  poor:      { bars: 1, color: '#e74c3c' },
  lost:      { bars: 0, color: '#e74c3c' },
  unknown:   { bars: 0, color: '#666' },
}

const qualityBars = computed(() => QUALITY_MAP[props.participant.connectionQuality]?.bars ?? 0)
const qualityColor = computed(() => QUALITY_MAP[props.participant.connectionQuality]?.color ?? '#666')
const shouldMirror = computed(() => props.mirror ?? (!props.isScreenShare && props.participant.isLocal))
const hasVideo = computed(() => !!(props.isScreenShare ? props.participant.screenShareTrack : props.participant.videoTrack))
</script>

<template>
  <div
    class="rtc-participant-tile"
    :class="{
      'rtc-participant-tile--speaking': participant.isSpeaking && !isScreenShare,
      'rtc-participant-tile--screenshare': isScreenShare,
    }"
    :data-participant-id="participant.id"
    @click="emit('click')"
  >
    <video
      ref="videoRef"
      autoplay
      playsinline
      muted
      class="rtc-participant-tile__video"
      :class="{
        'rtc-participant-tile__video--mirrored': shouldMirror,
        'rtc-participant-tile__video--hidden': !hasVideo,
      }"
      :style="{ objectFit }"
    />
    <audio v-if="!participant.isLocal && !isScreenShare" ref="audioRef" autoplay playsinline />

    <div v-if="!hasVideo && !isScreenShare" class="rtc-participant-tile__avatar" aria-hidden="true">
      <span class="rtc-participant-tile__initials">{{ participant.name.charAt(0).toUpperCase() }}</span>
    </div>

    <div v-if="showName || showSpeakingIndicator || showMuteIndicator || showQualityBadge" class="rtc-participant-tile__info">
      <span v-if="showName" class="rtc-participant-tile__name">
        {{ isScreenShare ? `${participant.name}'s screen` : participant.name }}
      </span>
      <span v-if="!isScreenShare && showSpeakingIndicator && participant.isSpeaking" class="rtc-participant-tile__speaking-icon" aria-label="Speaking">🎙</span>
      <span v-if="!isScreenShare && showMuteIndicator && participant.isMuted" class="rtc-participant-tile__muted" aria-label="Muted">🔇</span>
      <span v-if="!isScreenShare && showQualityBadge" class="rtc-quality-badge" :aria-label="`Quality: ${participant.connectionQuality}`">
        <span
          v-for="n in [1, 2, 3]"
          :key="n"
          class="rtc-quality-badge__bar"
          :style="{ height: `${4 + n * 3}px`, background: n <= qualityBars ? qualityColor : 'rgba(255,255,255,0.2)' }"
        />
      </span>
    </div>

    <span v-if="participant.isScreenSharing && !isScreenShare" class="rtc-participant-tile__screen-badge" aria-label="Screen sharing">🖥</span>
  </div>
</template>
