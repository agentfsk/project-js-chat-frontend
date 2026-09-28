import { useEffect, useRef, useState } from 'react'
import type { Channel, UserProfile } from '../types'
import { canKickFromGroup, canMuteGroupMember, canSetGroupAdmin } from '../utils/permissions'

type GroupMemberMenuProps = {
  x: number
  y: number
  channel: Channel
  me: UserProfile | null
  member: UserProfile
  onPromote: () => void
  onMute: (untilIso: string) => void
  onUnmute: () => void
  onKick: () => void
  onClose: () => void
}

const MUTE_DURATIONS: { label: string; minutes: number }[] = [
  { label: '1 ч', minutes: 60 },
  { label: '2 ч', minutes: 120 },
  { label: '5 ч', minutes: 300 },
  { label: '12 ч', minutes: 720 },
  { label: '24 ч', minutes: 1440 },
  { label: '3 дня', minutes: 4320 },
]

function muteUntilIso(minutes: number): string {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString()
}

const MENU_ITEM_HEIGHT = 44

// Context menu on a group member row. Reuses the message context menu surface;
// a second tap on «Заглушить» swaps the items for the duration list, which the
// spec keeps in the danger colour.
function GroupMemberMenu({
  x,
  y,
  channel,
  me,
  member,
  onPromote,
  onMute,
  onUnmute,
  onKick,
  onClose,
}: GroupMemberMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [muting, setMuting] = useState(false)

  const isMuted = channel.muted?.some((m) => m.userId === member.id) ?? false
  const canMute = canMuteGroupMember(channel, me, member.id)
  const canPromote = canSetGroupAdmin(channel, me, member.id) && !(channel.admins ?? []).includes(member.id)
  const canKick = canKickFromGroup(channel, me, member.id)

  const items: { id: string; label: string; danger?: boolean }[] = []
  if (canPromote) items.push({ id: 'promote', label: 'Сделать администратором' })
  if (canMute) {
    items.push(isMuted ? { id: 'unmute', label: 'Вернуть голос' } : { id: 'mute', label: 'Заглушить' })
  }
  if (canKick) items.push({ id: 'kick', label: 'Удалить', danger: true })

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const pickDuration = (minutes: number) => {
    onMute(muteUntilIso(minutes))
    onClose()
  }

  const rowCount = muting ? MUTE_DURATIONS.length : items.length

  return (
    <div
      ref={menuRef}
      className="message-context-menu-wrap"
      style={{
        left: `min(${x}px, calc(100vw - var(--menu-w) - 24px))`,
        top: `max(8px, min(${y}px, calc(100vh - ${rowCount * MENU_ITEM_HEIGHT}px)))`,
      }}
      role="menu"
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="message-context-menu">
        {muting ? (
          MUTE_DURATIONS.map((duration) => (
            <button
              key={duration.label}
              type="button"
              role="menuitem"
              className="message-context-menu-item danger"
              onClick={() => pickDuration(duration.minutes)}
            >
              {duration.label}
            </button>
          ))
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className={`message-context-menu-item${item.danger ? ' danger' : ''}`}
              onClick={() => {
                if (item.id === 'promote') onPromote()
                else if (item.id === 'unmute') onUnmute()
                else if (item.id === 'kick') onKick()
                else if (item.id === 'mute') {
                  setMuting(true)
                  return
                }
                onClose()
              }}
            >
              {item.label}
            </button>
          ))
        )}
      </div>
    </div>
  )
}

export default GroupMemberMenu