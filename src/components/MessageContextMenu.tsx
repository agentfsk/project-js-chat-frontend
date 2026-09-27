import { useEffect, useRef } from 'react'
import { REACTION_EMOJIS } from '../data/emoji'

export type MessageMenuAction = {
  id: 'edit' | 'delete' | 'pin' | 'reply'
  label: string
  danger?: boolean
}

type MessageContextMenuProps = {
  x: number
  y: number
  actions: MessageMenuAction[]
  activeReactions: string[]
  onReact: (emoji: string) => void
  onSelect: (action: MessageMenuAction) => void
  onClose: () => void
}

// The wrapper is the only positioned box. The clamp reserves room for the
// actions bubble plus the reaction bubble and the gap that separates them, so
// the pair stays on screen together for a message near the top of the viewport.
const MENU_ITEM_HEIGHT = 44
const REACTION_BLOCK_HEIGHT = 52

function MessageContextMenu({
  x,
  y,
  actions,
  activeReactions,
  onReact,
  onSelect,
  onClose,
}: MessageContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    // Any scroll dismisses the menu, because the conversation moving under it is
    // what would leave it pointing at nothing. Scrolling the reaction strip
    // reaches this listener too - a scroll event does not bubble, but a
    // capturing listener on an ancestor still receives it - so a scroll that
    // starts inside the menu is not a dismissal.
    const handleScroll = (event: Event) => {
      if (menuRef.current?.contains(event.target as Node)) return
      onClose()
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [onClose])

  return (
    <div
      ref={menuRef}
      className="message-context-menu-wrap"
      style={{
        left: `min(${x}px, calc(100vw - var(--menu-w) - 24px))`,
        top: `max(8px, min(${y}px, calc(100vh - ${actions.length * MENU_ITEM_HEIGHT + REACTION_BLOCK_HEIGHT}px)))`,
      }}
      role="menu"
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="context-menu-reactions" data-reaction-strip>
        {REACTION_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className={`context-menu-reaction${activeReactions.includes(emoji) ? ' active' : ''}`}
            onClick={() => {
              onReact(emoji)
              onClose()
            }}
          >
            {emoji}
          </button>
        ))}
      </div>
      <div className="message-context-menu">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            role="menuitem"
            className={`message-context-menu-item${action.danger ? ' danger' : ''}`}
            onClick={() => onSelect(action)}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default MessageContextMenu
