<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { useCall, useMessages } from '../composables.js'

const call = useCall()
const messages = useMessages()
const text = ref('')
const listRef = ref<HTMLElement | null>(null)

watch(messages, async () => {
  await nextTick()
  if (listRef.value) listRef.value.scrollTop = listRef.value.scrollHeight
})

async function send() {
  const t = text.value.trim()
  if (!t) return
  await call.sendMessage(t)
  text.value = ''
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    void send()
  }
}
</script>

<template>
  <div class="rtc-chat-panel">
    <div ref="listRef" class="rtc-chat-panel__messages" role="log" aria-live="polite" aria-relevant="additions">
      <div v-for="msg in messages" :key="msg.id" class="rtc-chat-panel__message">
        <strong class="rtc-chat-panel__sender">{{ msg.fromName }}</strong>
        <span class="rtc-chat-panel__text">{{ msg.text }}</span>
        <time class="rtc-chat-panel__time" :datetime="msg.timestamp.toISOString()">
          {{ msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
        </time>
      </div>
    </div>
    <div class="rtc-chat-panel__input-row">
      <textarea
        v-model="text"
        class="rtc-chat-panel__input"
        placeholder="Type a message… (Ctrl+Enter to send)"
        rows="2"
        aria-label="Chat message"
        @keydown="onKeydown"
      />
      <button class="rtc-chat-panel__send" :disabled="!text.trim()" aria-label="Send message" @click="send">
        Send
      </button>
    </div>
  </div>
</template>
