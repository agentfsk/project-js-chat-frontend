import { useRef, useState, type FormEvent } from 'react'
import Modal from './Modal'
import Avatar from './Avatar'
import { useUsersStore } from '../store/users'
import { emitCreateGroup, emitEditGroup } from '../socket'
import { uploadAvatar, ALLOWED_AVATAR_TYPES, MAX_AVATAR_SIZE } from '../api/uploads'
import type { Channel } from '../types'

type CreateGroupModalProps = {
  channel?: Channel | null
  onClose: () => void
}

// One dialog covers both creation (channel absent) and editing (channel
// present). Editing never changes membership — that path goes through invite.
function CreateGroupModal({ channel, onClose }: CreateGroupModalProps) {
  const contacts = useUsersStore((state) => state.contacts)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(channel?.name ?? '')
  const [description, setDescription] = useState(channel?.description ?? '')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(channel?.avatarUrl ?? null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const editing = Boolean(channel)

  const toggleMember = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleAvatarFile = async (file: File | undefined) => {
    setError(null)
    if (!file) return
    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
      setError('Можно загружать только изображения (PNG, JPG, GIF, WebP)')
      return
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setError('Файл слишком большой (максимум 1 МБ)')
      return
    }
    try {
      const { url } = await uploadAvatar(file)
      setAvatarUrl(url)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось загрузить аватар')
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Введите название группы')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: trimmedName,
        description: description.trim(),
        avatarUrl,
      }
      if (editing && channel) {
        await emitEditGroup(channel.id, payload)
      } else {
        await emitCreateGroup({ ...payload, memberIds: [...selected] })
      }
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось сохранить группу')
      setSaving(false)
    }
  }

  return (
    <Modal title={editing ? 'Изменить группу' : 'Создать группу'} onClose={onClose} wide>
      <div className="profile-view">
        <Avatar username={name.trim() || 'Группа'} src={avatarUrl} size={72} />
        {avatarUrl ? (
          <button type="button" className="avatar-remove" onClick={() => setAvatarUrl(null)}>
            Удалить аватар
          </button>
        ) : (
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            Загрузить аватар
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          hidden
          onChange={(event) => void handleAvatarFile(event.target.files?.[0])}
        />
      </div>
      <form onSubmit={handleSubmit}>
        <label className="form-field">
          Название
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Название группы"
          />
        </label>
        <label className="form-field">
          Описание
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            placeholder="О чём эта группа?"
          />
        </label>
        {!editing && (
          <div className="member-picker">
            <span className="member-picker-title">
              Участники ({selected.size}/{contacts.length})
            </span>
            <ul className="member-picker-list">
              {contacts.length === 0 && (
                <li className="search-empty">Нет контактов для добавления</li>
              )}
              {contacts.map((contact) => (
                <li key={contact.id} className="member-picker-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={selected.has(contact.id)}
                      onChange={() => toggleMember(contact.id)}
                    />
                    <Avatar username={contact.username} src={contact.avatarUrl} size={24} />
                    <span>{contact.username}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" disabled={saving}>
            {saving ? 'Сохраняем...' : editing ? 'Сохранить' : 'Создать'}
          </button>
        </div>
      </form>
      {error && <p className="form-error">{error}</p>}
    </Modal>
  )
}

export default CreateGroupModal