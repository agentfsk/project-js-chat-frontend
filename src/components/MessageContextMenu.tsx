import { useEffect, useRef } from 'react'

export type MessageMenuAction = {
  id: 'edit' | 'delete' | 'pin'
  label: string
  danger?: boolean
}

type MessageContextMenuProps = {
  x: number
  y: number
  actions: MessageMenuAction[]
  onSelect: (action: MessageMenuAction) => void
  onClose: () => void
}

function MessageContextMenu({ x, y, actions, onSelect, onClose }: MessageContextMenuProps) {
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
    const handleScroll = () => onClose()

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
      className="message-context-menu"
      style={{ left: `min(${x}px, calc(100vw - 220px))`, top: `min(${y}px, calc(100vh - ${actions.length * 44}px))` }}
      role="menu"
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => event.stopPropagation()}
    >
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
  )
}

export default MessageContextMenu