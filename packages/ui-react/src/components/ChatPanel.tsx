import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import { useMessages, useMediaControls } from '../hooks.js'

interface Props {
  className?: string
}

export function ChatPanel({ className }: Props) {
  const messages = useMessages()
  const { sendMessage } = useMediaControls()
  const [text, setText] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    const trimmed = text.trim()
    if (!trimmed) return
    await sendMessage(trimmed)
    setText('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      void handleSend()
    }
  }

  return (
    <div className={`rtc-chat-panel ${className ?? ''}`}>
      <div ref={listRef} className="rtc-chat-panel__messages" role="log" aria-live="polite" aria-relevant="additions">
        {messages.map((msg) => (
          <div key={msg.id} className="rtc-chat-panel__message">
            <strong className="rtc-chat-panel__sender">{msg.fromName}</strong>
            <span className="rtc-chat-panel__text">{msg.text}</span>
            <time className="rtc-chat-panel__time" dateTime={msg.timestamp.toISOString()}>
              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </time>
          </div>
        ))}
      </div>
      <div className="rtc-chat-panel__input-row">
        <textarea
          className="rtc-chat-panel__input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Ctrl+Enter to send)"
          rows={2}
          aria-label="Chat message"
        />
        <button
          className="rtc-chat-panel__send"
          onClick={handleSend}
          disabled={!text.trim()}
          aria-label="Send message"
        >
          Send
        </button>
      </div>
    </div>
  )
}
