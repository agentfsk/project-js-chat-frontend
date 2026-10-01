import { useRef, useState } from 'react'
import Modal from './Modal'
import Avatar from './Avatar'
import { useUsersStore } from '../store/users'
import { updateProfile } from '../api/users'
import { uploadAvatar, ALLOWED_AVATAR_TYPES, MAX_AVATAR_SIZE } from '../api/uploads'

type EditProfileModalProps = {
  onClose: () => void
}

function EditProfileModal({ onClose }: EditProfileModalProps) {
  const me = useUsersStore((state) => state.me)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [nickname, setNickname] = useState(me?.username ?? '')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(me?.avatarUrl ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!me) return null

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
      await updateProfile({ avatarUrl: url })
      setAvatarUrl(url)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось загрузить аватар')
    }
  }

  const handleRemoveAvatar = async () => {
    setError(null)
    try {
      await updateProfile({ avatarUrl: null })
      setAvatarUrl(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось удалить аватар')
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    const newName = nickname.trim()
    if (!newName) {
      setError('Ник не может быть пустым')
      return
    }
    setSaving(true)
    try {
      await updateProfile({ username: newName })
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось сохранить ник')
      setSaving(false)
    }
  }

  return (
    <Modal title="Мой профиль" onClose={onClose}>
      <div className="profile-view">
        <Avatar username={me.username} src={avatarUrl} size={72} />
        {avatarUrl ? (
          <button type="button" className="avatar-remove" onClick={handleRemoveAvatar}>
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
        <label>
          Ник
          <input
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="Ваш ник"
          />
        </label>
        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" disabled={saving}>
            Сохранить
          </button>
        </div>
      </form>
      {error && <p className="form-error">{error}</p>}
    </Modal>
  )
}

export default EditProfileModal