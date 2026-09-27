import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { Channel, Message, MessageReaction, UserProfile } from '../types'
import { formatBytes, formatTime } from '../utils/format'
import { resolveMediaUrl } from '../utils/mediaUrl'
import { canDeleteMessage, canEditMessage, canPinMessage } from '../utils/permissions'
import { useUsersStore } from '../store/users'
import Avatar from './Avatar'
import MessageContextMenu, { type MessageMenuAction } from './MessageContextMenu'

const LONG_PRESS_MS = 500
const LONG_PRESS_MOVE_TOLERANCE = 10
const GROUP_WINDOW_MS = 5 * 60 * 1000

// Consecutive messages of one author join a visual group while they stay within
// GROUP_WINDOW_MS of each other. Without a usable timestamp nothing is grouped,
// so an unknown time can never glue unrelated messages together.
function canJoinGroup(current: Message, neighbour: Message | undefined): boolean {
  if (!neighbour) return false
  if (neighbour.userId !== current.userId) return false
  if (!current.createdAt || !neighbour.createdAt) return false
  const currentAt = new Date(current.createdAt).getTime()
  const neighbourAt = new Date(neighbour.createdAt).getTime()
  if (Number.isNaN(currentAt) || Number.isNaN(neighbourAt)) return false
  return Math.abs(currentAt - neighbourAt) <= GROUP_WINDOW_MS
}

type GroupInfo = {
  startsGroup: boolean
  endsGroup: boolean
}

function getGroupInfo(messages: Message[], index: number): GroupInfo {
  const current = messages[index]
  if (!current) return { startsGroup: true, endsGroup: true }
  return {
    startsGroup: !canJoinGroup(current, messages[index - 1]),
    endsGroup: !canJoinGroup(current, messages[index + 1]),
  }
}

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
  onReply: (message: Message) => void
  onMessageReaction: (message: Message, emoji: string) => void
}

const ATTACHMENT_MAX_EDGE = 260
// Stand-in ratio for images that arrive without dimensions, so the row still
// reserves a box before the bytes land instead of jumping to full height.
const FALLBACK_ATTACHMENT_RATIO = 4 / 3

function attachmentBox(attachment: NonNullable<Message['attachment']>): { width: number; aspectRatio: string } {
  const { width, height } = attachment
  if (!width || !height || width <= 0 || height <= 0) {
    return { width: ATTACHMENT_MAX_EDGE, aspectRatio: String(FALLBACK_ATTACHMENT_RATIO) }
  }
  // Cap the longest edge so a portrait image reserves a tall-but-bounded box
  // instead of a full 260px-wide column.
  const ratio = width / height
  const boxWidth = Math.min(ATTACHMENT_MAX_EDGE, Math.round(ATTACHMENT_MAX_EDGE * ratio))
  return { width: boxWidth, aspectRatio: String(ratio) }
}

function AttachmentView({ attachment }: { attachment: NonNullable<Message['attachment']> }) {
  const url = resolveMediaUrl(attachment.url) ?? attachment.url
  if (attachment.mime.startsWith('image/')) {
    return (
      <a
        className="message-attachment-image"
        href={url}
        target="_blank"
        rel="noreferrer"
        style={attachmentBox(attachment)}
      >
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

type ReactionChip = { emoji: string; count: number; mine: boolean }

function groupReactions(reactions: MessageReaction[] | undefined, myId: number | null): ReactionChip[] {
  const map = new Map<string, ReactionChip>()
  for (const reaction of reactions ?? []) {
    const entry = map.get(reaction.emoji) ?? { emoji: reaction.emoji, count: 0, mine: false }
    entry.count += 1
    if (reaction.userId === myId) entry.mine = true
    map.set(reaction.emoji, entry)
  }
  return [...map.values()]
}

function MessageReplyQuote({
  replyTo,
  onJump,
}: {
  replyTo: NonNullable<Message['replyTo']>
  onJump: (id: number) => void
}) {
  return (
    <button type="button" className="message-reply" onClick={() => onJump(replyTo.id)}>
      <span className="message-reply-author">{replyTo.username}</span>
      <span className="message-reply-text">
        {replyTo.body || (replyTo.attachment ? 'Вложение' : '')}
      </span>
    </button>
  )
}

const MessageList = forwardRef<MessageListHandle, MessageListProps>(function MessageList(
  { messages, channel, me, editingId, onEdit, onDelete, onPinToggle, onReply, onMessageReaction },
  ref,
) {
  const listRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const longPressTimer = useRef<number | null>(null)
  const longPressHandled = useRef(false)
  const longPressStart = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  const [menu, setMenu] = useState<{ message: Message; x: number; y: number } | null>(null)
  const profiles = useUsersStore((state) => state.profiles)

  const scrollToMessage = (id: number) => {
    const target = listRef.current?.querySelector(`[data-message-id="${id}"]`)
    target?.scrollIntoView({ block: 'center' })
  }

  useImperativeHandle(ref, () => ({ scrollToMessage }))

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
    const actions: MessageMenuAction[] = [{ id: 'reply', label: 'Ответить' }]
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
    if (action.id === 'reply') onReply(message)
    else if (action.id === 'edit') onEdit(message)
    else if (action.id === 'delete') onDelete(message)
    else if (action.id === 'pin') onPinToggle(message)
  }

  return (
    <div className="message-list" ref={listRef}>
      {messages.map((message, index) => {
        const isOwn = Boolean(me && message.userId === me.id)
        const { startsGroup, endsGroup } = getGroupInfo(messages, index)
        const time = formatTime(message.createdAt)
        const rowClass = [
          'message',
          isOwn ? 'own' : 'incoming',
          startsGroup ? 'group-start' : '',
          endsGroup ? 'group-end' : '',
          message.pinned ? 'pinned' : '',
          message.id === editingId ? 'editing' : '',
        ].filter(Boolean).join(' ')
        return (
          <div
            className={rowClass}
            key={message.id}
            data-message-id={message.id}
            onContextMenu={(event) => handleContextMenu(message, event)}
            onTouchStart={(event) => handleTouchStart(message, event)}
            onTouchMove={handleTouchMove}
            onTouchEnd={clearLongPress}
            onTouchCancel={clearLongPress}
          >
            <div className="message-avatar-cell">
              {!isOwn && endsGroup && (
                <Avatar
                  username={message.username}
                  src={profiles[message.userId]?.avatarUrl ?? null}
                  size={28}
                />
              )}
            </div>
            <div className="message-bubble">
              {!isOwn && startsGroup && (
                <div className="message-head">
                  <span className="message-user">{message.username}</span>
                </div>
              )}
              <div className="message-content">
                {message.replyTo && <MessageReplyQuote replyTo={message.replyTo} onJump={scrollToMessage} />}
                {message.body && <span className="message-body">{message.body}</span>}
                {message.edited && <span className="message-edit-badge">изменено</span>}
                {message.attachment && <AttachmentView attachment={message.attachment} />}
              </div>
              <div className="message-footer">
                {me && (
                  <div className="message-reactions">
                    {groupReactions(message.reactions, me.id).map((chip) => (
                      <button
                        key={chip.emoji}
                        type="button"
                        className={`reaction-chip${chip.mine ? ' mine' : ''}`}
                        onClick={() => onMessageReaction(message, chip.emoji)}
                      >
                        <span className="reaction-chip-emoji">{chip.emoji}</span>
                        <span className="reaction-chip-count">{chip.count}</span>
                      </button>
                    ))}
                  </div>
                )}
                <span className="message-meta">
                  {message.pinned && <PinIcon />}
                  {time && <span className="message-time">{time}</span>}
                </span>
              </div>
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
      {menu && (
        <MessageContextMenu
          x={menu.x}
          y={menu.y}
          actions={buildActions(menu.message)}
          activeReactions={menu.message.reactions?.filter((r) => r.userId === me?.id).map((r) => r.emoji) ?? []}
          onReact={(emoji) => onMessageReaction(menu.message, emoji)}
          onSelect={handleMenuSelect}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  )
})

export default MessageList