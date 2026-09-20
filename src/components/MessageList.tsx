import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { Channel, Message, MessageReaction, UserProfile } from '../types'
import { formatBytes } from '../utils/format'
import { resolveMediaUrl } from '../utils/mediaUrl'
import { canDeleteMessage, canEditMessage, canPinMessage } from '../utils/permissions'
import { REACTION_EMOJIS } from '../data/emoji'
import { useUsersStore } from '../store/users'
import Avatar from './Avatar'
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
  onReply: (message: Message) => void
  onMessageReaction: (message: Message, emoji: string) => void
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
  const [reactionFor, setReactionFor] = useState<number | null>(null)
  const reactionPopoverRef = useRef<HTMLDivElement>(null)
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
    if (reactionFor === null) return
    const popover = reactionPopoverRef.current
    const list = listRef.current
    if (popover && list) {
      const popoverRect = popover.getBoundingClientRect()
      const listRect = list.getBoundingClientRect()
      popover.classList.toggle('flip-up', popoverRect.bottom > listRect.bottom)
    }
  }, [reactionFor])

  useEffect(() => {
    if (reactionFor === null) return
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null
      if (target && (target.closest('[data-reaction-popover]') || target.closest('[data-reaction-toggle]'))) {
        return
      }
      setReactionFor(null)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setReactionFor(null)
    }
    const handleScroll = () => setReactionFor(null)

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [reactionFor])

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
            <Avatar
              username={message.username}
              src={profiles[message.userId]?.avatarUrl ?? null}
              size={26}
            />
            <span className="message-user">{message.username}</span>
            {message.pinned && <PinIcon />}
          </div>
          <div className="message-content">
            {message.replyTo && <MessageReplyQuote replyTo={message.replyTo} onJump={scrollToMessage} />}
            {message.body && <span className="message-body">{message.body}</span>}
            {message.edited && <span className="message-edit-badge">изменено</span>}
            {message.attachment && <AttachmentView attachment={message.attachment} />}
          </div>
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
              <button
                type="button"
                data-reaction-toggle
                className="reaction-add"
                title="Добавить реакцию"
                onClick={() => setReactionFor(reactionFor === message.id ? null : message.id)}
              >
                +
              </button>
              {reactionFor === message.id && (
                <div className="reaction-popover" data-reaction-popover ref={reactionPopoverRef}>
                  {REACTION_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className={`reaction-popover-item${
                        message.reactions?.some((r) => r.userId === me.id && r.emoji === emoji)
                          ? ' active'
                          : ''
                      }`}
                      onClick={() => {
                        onMessageReaction(message, emoji)
                        setReactionFor(null)
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
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