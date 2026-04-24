<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { useCall, useDevices } from '../composables.js'

type DeviceKind = 'audioinput' | 'audiooutput' | 'videoinput'

const call = useCall()
const devices = useDevices()

const selected = ref<Record<DeviceKind, string>>({
  audioinput: '',
  audiooutput: '',
  videoinput: '',
})

// Seed first available device when list populates
watchEffect(() => {
  if (!selected.value.audioinput && devices.value.audioinput[0])
    selected.value.audioinput = devices.value.audioinput[0].deviceId
  if (!selected.value.audiooutput && devices.value.audiooutput[0])
    selected.value.audiooutput = devices.value.audiooutput[0].deviceId
  if (!selected.value.videoinput && devices.value.videoinput[0])
    selected.value.videoinput = devices.value.videoinput[0].deviceId
})

async function onChange(kind: DeviceKind, deviceId: string) {
  selected.value[kind] = deviceId
  await call.switchDevice(kind, deviceId)
}
</script>

<template>
  <div class="rtc-device-selector" role="dialog" aria-label="Device settings">
    <div class="rtc-device-selector__header">Device Settings</div>

    <div v-if="devices.audioinput.length" class="rtc-device-selector__group">
      <label class="rtc-device-selector__label">
        <span class="rtc-device-selector__icon">🎤</span>Microphone
      </label>
      <select
        class="rtc-device-selector__select"
        :value="selected.audioinput"
        aria-label="Select microphone"
        @change="onChange('audioinput', ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="(d, i) in devices.audioinput" :key="d.deviceId" :value="d.deviceId">
          {{ d.label || `Microphone ${i + 1}` }}
        </option>
      </select>
    </div>

    <div v-if="devices.audiooutput.length" class="rtc-device-selector__group">
      <label class="rtc-device-selector__label">
        <span class="rtc-device-selector__icon">🔊</span>Speaker
      </label>
      <select
        class="rtc-device-selector__select"
        :value="selected.audiooutput"
        aria-label="Select speaker"
        @change="onChange('audiooutput', ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="(d, i) in devices.audiooutput" :key="d.deviceId" :value="d.deviceId">
          {{ d.label || `Speaker ${i + 1}` }}
        </option>
      </select>
    </div>

    <div v-if="devices.videoinput.length" class="rtc-device-selector__group">
      <label class="rtc-device-selector__label">
        <span class="rtc-device-selector__icon">📷</span>Camera
      </label>
      <select
        class="rtc-device-selector__select"
        :value="selected.videoinput"
        aria-label="Select camera"
        @change="onChange('videoinput', ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="(d, i) in devices.videoinput" :key="d.deviceId" :value="d.deviceId">
          {{ d.label || `Camera ${i + 1}` }}
        </option>
      </select>
    </div>
  </div>
</template>
