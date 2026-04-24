<script setup lang="ts">
import { computed } from 'vue'
import { useParticipants, useLocalParticipant, useScreenShares, useCall } from '../composables.js'
import ParticipantVideo from './ParticipantVideo.vue'

withDefaults(defineProps<{
  participantVideoProps?: Record<string, unknown>
}>(), {
  participantVideoProps: () => ({}),
})

useCall() // assert context
const remote = useParticipants()
const local = useLocalParticipant()
const screenShares = useScreenShares()

const all = computed(() => (local.value ? [local.value, ...remote.value] : remote.value))

const gridClass = computed(() => {
  const n = all.value.length
  if (n <= 1) return 'rtc-grid--1'
  if (n <= 2) return 'rtc-grid--2'
  if (n <= 4) return 'rtc-grid--4'
  if (n <= 9) return 'rtc-grid--9'
  return 'rtc-grid--many'
})

const featuredShare = computed(() => screenShares.value[0] ?? null)
</script>

<template>
  <!-- Screen share layout -->
  <div
    v-if="featuredShare"
    class="rtc-video-grid rtc-layout--screenshare"
    role="list"
    aria-label="Participants"
  >
    <div class="rtc-screenshare__main" role="listitem">
      <ParticipantVideo :participant="featuredShare" :is-screen-share="true" v-bind="participantVideoProps" />
    </div>
    <div class="rtc-screenshare__strip">
      <div v-for="p in all" :key="p.id" class="rtc-screenshare__thumb" role="listitem">
        <ParticipantVideo :participant="p" v-bind="participantVideoProps" />
      </div>
    </div>
  </div>

  <!-- Default grid layout -->
  <div
    v-else
    class="rtc-video-grid"
    :class="gridClass"
    role="list"
    aria-label="Participants"
  >
    <div v-for="p in all" :key="p.id" role="listitem">
      <ParticipantVideo :participant="p" v-bind="participantVideoProps" />
    </div>
  </div>
</template>
