import { useEffect, useRef, useState, type TouchEvent } from 'react'
import Modal from './Modal'
import Avatar from './Avatar'
import { useChatStore } from '../store/chat'
import { useUsersStore } from '../store/users'
import {
  emitKickFromGroup,
  emitMuteGroupMember,
  emitRemoveGroup,
  emitSetGroupAdmin,
  emitUnmuteGroupMember,
} from '../socket'
import { isGroupOwner, canActOnGroupMember } from '../utils/permissions'
import type { UserProfile } from '../types'
import CreateGroupModal from './CreateGroupModal'
import InviteMembersModal from './InviteMembersModal'
import ConfirmDialog from './ConfirmDialog'
import TypeYesDeleteDialog from './TypeYesDeleteDialog'
import GroupMemberMenu from './GroupMemberMenu'

const LONG_PRESS_MS = 500
const LONG_PRESS_MOVE_TOLERANCE = 10

type GroupInfoModalProps = {
  channelId: number
  onClose: () => void
}

function GroupInfoModal({ channelId, onClose }: GroupInfoModalProps) {
  const channel = useChatStore((state) => state.channels.find((c) => c.id === channelId) ?? null)
  const me = useUsersStore((state) => state.me)
  const setError = useChatStore((state) => state.setError)
  const [menu, setMenu] = useState<{ member: UserProfile; x: number; y: number } | null>(null)
  const [inviting, setInviting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [kickTarget, setKickTarget] = useState<UserProfile | null>(null)
  const [deleteStage, setDeleteStage] = useState<'none' | 'confirm' | 'typed'>('none')
  const longPressTimer = useRef<number | null>(null)
  const longPressStart = useRef<{ x: number; y: number; moved: boolean } | null>(null)

  useEffect(
    () => () => {
      if (longPressTimer.current !== null) window.clearTimeout(longPressTimer.current)
    },
    [],
  )

  if (!channel || !me) return null

  const owner = isGroupOwner(channel, me)
  const members = channel.members ?? []
  const isMuted = (id: number) => channel.muted?.some((m) => m.userId === id) ?? false

  const handleActionError = (fallback: string) => (caught: unknown) => {
    const message = caught instanceof Error ? caught.message : fallback
    setError(typeof message === 'string' ? message : fallback)
  }

  const startLongPress = (member: UserProfile, event: TouchEvent) => {
    const touch = event.touches[0]
    if (!touch) return
    longPressStart.current = { x: touch.clientX, y: touch.clientY, moved: false }
    longPressTimer.current = window.setTimeout(() => {
      const start = longPressStart.current
      if (!start || start.moved) return
      openMemberMenu(member, start.x, start.y)
    }, LONG_PRESS_MS)
  }

  const moveLongPress = (event: TouchEvent) => {
    const start = longPressStart.current
    const touch = event.touches[0]
    if (!start || !touch) return
    if (Math.hypot(touch.clientX - start.x, touch.clientY - start.y) > LONG_PRESS_MOVE_TOLERANCE) {
      start.moved = true
    }
  }

  const clearLongPress = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    longPressStart.current = null
  }

  const openMemberMenu = (member: UserProfile, x: number, y: number) => {
    if (canActOnGroupMember(channel, me, member.id)) {
      setMenu({ member, x, y })
    }
  }

  return (
    <Modal title="О группе" onClose={onClose} wide>
      <div className="profile-view">
        <Avatar username={channel.name} src={channel.avatarUrl} size={72} />
        <span className="profile-name">{channel.name}</span>
        {channel.description && <span className="profile-description">{channel.description}</span>}
      </div>
      <div className="member-list">
        <span className="member-list-title">Участники</span>
        <ul className="member-list-items">
          {members.length === 0 && <li className="search-empty">Нет участников</li>}
          {members.map((member) => {
            const memberId = member.id
            const roleLabel =
              memberId === channel.ownerId
                ? 'Владелец'
                : (channel.admins ?? []).includes(memberId)
                  ? 'Админ'
                  : null
            return (
              <li
                key={memberId}
                className="member-row"
                onContextMenu={(event) => {
                  event.preventDefault()
                  openMemberMenu(member, event.clientX, event.clientY)
                }}
                onTouchStart={(event) => startLongPress(member, event)}
                onTouchMove={moveLongPress}
                onTouchEnd={clearLongPress}
                onTouchCancel={clearLongPress}
              >
                <Avatar username={member.username} src={member.avatarUrl} size={28} />
                <span className="member-name">{member.username}</span>
                {roleLabel && <span className="member-role">{roleLabel}</span>}
                {isMuted(memberId) && <span className="member-role muted">Заглушён</span>}
              </li>
            )
          })}
        </ul>
      </div>
      {owner && (
        <div className="profile-actions">
          <button type="button" onClick={() => setInviting(true)}>
            Пригласить друзей
          </button>
          <button type="button" onClick={() => setEditing(true)}>
            Изменить группу
          </button>
          <button type="button" className="danger-btn" onClick={() => setDeleteStage('confirm')}>
            Удалить группу
          </button>
        </div>
      )}

      {menu && (
        <GroupMemberMenu
          x={menu.x}
          y={menu.y}
          channel={channel}
          me={me}
          member={menu.member}
          onPromote={() => {
            emitSetGroupAdmin(channel.id, menu.member.id, true).catch(handleActionError('Не удалось назначить администратора'))
          }}
          onMute={(until) => {
            emitMuteGroupMember(channel.id, menu.member.id, until).catch(handleActionError('Не удалось заглушить участника'))
          }}
          onUnmute={() => {
            emitUnmuteGroupMember(channel.id, menu.member.id).catch(handleActionError('Не удалось вернуть голос'))
          }}
          onKick={() => setKickTarget(menu.member)}
          onClose={() => setMenu(null)}
        />
      )}
      {kickTarget && (
        <ConfirmDialog
          title="Удалить участника"
          message={`Вы уверены, что хотите удалить данного пользователя?`}
          confirmLabel="Да"
          cancelLabel="Нет"
          onSubmit={async () => {
            try {
              await emitKickFromGroup(channel.id, kickTarget.id)
              setKickTarget(null)
            } catch (caught) {
              handleActionError('Не удалось удалить участника')(caught)
            }
          }}
          onClose={() => setKickTarget(null)}
        />
      )}
      {deleteStage === 'confirm' && (
        <ConfirmDialog
          title="Удалить группу"
          message={`Вы уверены, что хотите удалить группу «${channel.name}»? Все сообщения будут удалены.`}
          confirmLabel="Да"
          cancelLabel="Нет"
          onSubmit={() => setDeleteStage('typed')}
          onClose={() => setDeleteStage('none')}
        />
      )}
      {deleteStage === 'typed' && (
        <TypeYesDeleteDialog
          title="Удалить группу"
          message="Введите «Yes», чтобы подтвердить удаление группы."
          onSubmit={async () => {
            try {
              await emitRemoveGroup(channel.id)
              onClose()
            } catch (caught) {
              handleActionError('Не удалось удалить группу')(caught)
            }
          }}
          onClose={() => setDeleteStage('none')}
        />
      )}
      {inviting && <InviteMembersModal channel={channel} onClose={() => setInviting(false)} />}
      {editing && <CreateGroupModal channel={channel} onClose={() => setEditing(false)} />}
    </Modal>
  )
}

export default GroupInfoModal