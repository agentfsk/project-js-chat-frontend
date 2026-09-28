import { useState } from 'react'
import Modal from './Modal'
import Avatar from './Avatar'
import { useUsersStore } from '../store/users'
import { emitInviteToGroup } from '../socket'
import type { Channel } from '../types'

type InviteMembersModalProps = {
  channel: Channel
  onClose: () => void
}

// Owner-only multi-select of contacts that are not yet group members.
function InviteMembersModal({ channel, onClose }: InviteMembersModalProps) {
  const contacts = useUsersStore((state) => state.contacts)
  const already = channel.participants ?? []
  const candidates = contacts.filter((contact) => !already.includes(contact.id))
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleInvite = async () => {
    setError(null)
    if (selected.size === 0 || sending) return
    setSending(true)
    try {
      await emitInviteToGroup(channel.id, [...selected])
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось пригласить участников')
      setSending(false)
    }
  }

  return (
    <Modal title="Пригласить друзей" onClose={onClose}>
      <ul className="member-picker-list">
        {candidates.length === 0 && (
          <li className="search-empty">
            Все контакты уже в группе
            <button type="button" className="modal-text-button" onClick={onClose}>
              Закрыть
            </button>
          </li>
        )}
        {candidates.map((contact) => (
          <li key={contact.id} className="member-picker-item">
            <label>
              <input
                type="checkbox"
                checked={selected.has(contact.id)}
                onChange={() => toggle(contact.id)}
              />
              <Avatar username={contact.username} src={contact.avatarUrl} size={24} />
              <span>{contact.username}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="modal-actions">
        <button type="button" onClick={onClose}>
          Отмена
        </button>
        <button type="button" onClick={() => void handleInvite()} disabled={sending || selected.size === 0}>
          Пригласить
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}
    </Modal>
  )
}

export default InviteMembersModal