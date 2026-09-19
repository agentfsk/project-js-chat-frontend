import { useEffect, useRef } from 'react'
import type { Message } from '../types'
import { formatBytes } from '../utils/format'
import { resolveMediaUrl } from '../utils/mediaUrl'

type MessageListProps = {
  messages: Message[]
}

function AttachmentView({ attachment }: { attachment: NonNullable<Message['attachment']> }) {
  const url = resolveMediaUrl(attachment.url) ?? attachment.url
  if (attachment.mime.startsWith('image/')) {
    return (
      <a className="message-attachment-image" href={url} target="_blank" rel="noreferrer">
        <img src={url} alt={attachment.name} />
      </a>
    )
  }
  return (
    <a className="message-attachment-file" href={url} download>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      <span className="message-attachment-file-name">{attachment.name}</span>
      <span className="message-attachment-file-size">{formatBytes(attachment.size)}</span>
    </a>
  )
}

function MessageList({ messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages])

  return (
    <div className="message-list">
      {messages.map((message) => (
        <div className="message" key={message.id}>
          <span className="message-user">{message.username}</span>
          <div className="message-content">
            {message.body && <span className="message-body">{message.body}</span>}
            {message.attachment && <AttachmentView attachment={message.attachment} />}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}

export default MessageList