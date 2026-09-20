import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { Channel, Message, UserProfile } from '../types'
import { formatBytes } from '../utils/format'
import { resolveMediaUrl } from '../utils/mediaUrl'
import { canDeleteMessage, canEditMessage, canPinMessage } from '../utils/permissions'
import MessageContextMenu, { type MessageMenuAction } from './MessageContextMenu'

const LONG_PRESS_MS = 500
const LONG_PRESS_MOVE_TOLERANCE = 10

export type MessageListHandle = {
  scrollToMessage: (id: number) => void
}

type MessageListProps = {
  messages: Message[]
  channel: Channel | null
  me: UserProfile | null
  editingId: number | null
  onEdit: (message: Message) => void
  onDelete: (message: Message) => void
  onPinToggle: (message: Message) => void
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

function PinIcon() {
  return (
    <svg className="pin-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16 9V4h1a1 1 0 0 0 0-2H7a1 1 0 0 0 0 2h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z" />
    </svg>
  )
}

const MessageList = forwardRef<MessageListHandle, MessageListProps>(function MessageList(
  { messages, channel, me, editingId, onEdit, onDelete, onPinToggle },
  ref,
) {
  const listRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const longPressTimer = useRef<number | null>(null)
  const longPressHandled = useRef(false)
  const longPressStart = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  const [menu, setMenu] = useState<{ message: Message; x: number; y: number } | null>(null)

  useImperativeHandle(ref, () => ({
    scrollToMessage: (id: number) => {
      const target = listRef.current?.querySelector(`[data-message-id="${id}"]`)
      target?.scrollIntoView({ block: 'center' })
    },
  }))

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages])

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const handleScroll = () => {
      if (longPressTimer.current !== null) {
        window.clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
      longPressStart.current = null
      setMenu(null)
    }
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [])

  const clearLongPress = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    longPressStart.current = null
  }

  const handleTouchStart = (message: Message, event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0]
    if (!touch) return
    longPressStart.current = { x: touch.clientX, y: touch.clientY, moved: false }
    longPressHandled.current = false
    longPressTimer.current = window.setTimeout(() => {
      const start = longPressStart.current
      if (!start || start.moved) return
      if (buildActions(message).length === 0) return
      longPressHandled.current = true
      setMenu({ message, x: start.x, y: start.y })
    }, LONG_PRESS_MS)
  }

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = longPressStart.current
    if (!start || !event.touches[0]) return
    if (Math.hypot(event.touches[0].clientX - start.x, event.touches[0].clientY - start.y) > LONG_PRESS_MOVE_TOLERANCE) {
      start.moved = true
    }
  }

  const handleContextMenu = (message: Message, event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (longPressHandled.current) {
      longPressHandled.current = false
      return
    }
    if (buildActions(message).length === 0) return
    setMenu({ message, x: event.clientX, y: event.clientY })
  }

  const buildActions = (message: Message): MessageMenuAction[] => {
    const actions: MessageMenuAction[] = []
    if (canEditMessage(message, me)) {
      actions.push({ id: 'edit', label: 'Изменить' })
    }
    if (canDeleteMessage(message, me)) {
      actions.push({ id: 'delete', label: 'Удалить', danger: true })
    }
    if (channel && canPinMessage(channel, me)) {
      actions.push({ id: 'pin', label: message.pinned ? 'Открепить' : 'Закрепить' })
    }
    return actions
  }

  const handleMenuSelect = (action: MessageMenuAction) => {
    if (!menu) return
    const { message } = menu
    setMenu(null)
    if (action.id === 'edit') onEdit(message)
    else if (action.id === 'delete') onDelete(message)
    else if (action.id === 'pin') onPinToggle(message)
  }

  return (
    <div className="message-list" ref={listRef}>
      {messages.map((message) => (
        <div
          className={[
            'message',
            message.pinned ? 'pinned' : '',
            message.id === editingId ? 'editing' : '',
          ].filter(Boolean).join(' ')}
          key={message.id}
          data-message-id={message.id}
          onContextMenu={(event) => handleContextMenu(message, event)}
          onTouchStart={(event) => handleTouchStart(message, event)}
          onTouchMove={handleTouchMove}
          onTouchEnd={clearLongPress}
          onTouchCancel={clearLongPress}
        >
          <div className="message-head">
            <span className="message-user">{message.username}</span>
            {message.pinned && <PinIcon />}
          </div>
          <div className="message-content">
            {message.body && <span className="message-body">{message.body}</span>}
            {message.edited && <span className="message-edit-badge">изменено</span>}
            {message.attachment && <AttachmentView attachment={message.attachment} />}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
      {menu && (
        <MessageContextMenu
          x={menu.x}
          y={menu.y}
          actions={buildActions(menu.message)}
          onSelect={handleMenuSelect}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  )
})

export default MessageList