import { useState } from 'react'
import Modal from './Modal'
import Avatar from './Avatar'
import { useUsersStore } from '../store/users'
import { useChatStore } from '../store/chat'
import { createPrivateChannel, sendContactRequest } from '../api/users'
import type { UserProfile } from '../types'

type ProfileModalProps = {
  profile: UserProfile
  onClose: () => void
}

function ProfileModal({ profile, onClose }: ProfileModalProps) {
  const isContact = useUsersStore((state) =>
    state.contacts.some((contact) => contact.id === profile.id),
  )
  const setActiveChannel = useChatStore((state) => state.setActiveChannel)
  const addChannel = useChatStore((state) => state.addChannel)
  const [status, setStatus] = useState<'idle' | 'busy' | 'pending'>('idle')
  const [error, setError] = useState<string | null>(null)

  const handleChat = async () => {
    setError(null)
    try {
      const { channel } = await createPrivateChannel(profile.id)
      addChannel(channel)
      setActiveChannel(channel.id)
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось открыть чат')
    }
  }

  const handleAddContact = async () => {
    setStatus('busy')
    setError(null)
    try {
      const { channel } = await sendContactRequest(profile.id)
      addChannel(channel)
      setStatus('pending')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось отправить запрос')
      setStatus('idle')
    }
  }

  return (
    <Modal title="Профиль" onClose={onClose}>
      <div className="profile-view">
        <Avatar username={profile.username} src={profile.avatarUrl} size={72} />
        <span className="profile-name">{profile.username}</span>
      </div>
      <div className="profile-actions">
        <button type="button" onClick={handleChat}>
          Написать
        </button>
        {isContact ? (
          <button type="button" disabled>
            В контактах
          </button>
        ) : (
          <button type="button" onClick={handleAddContact} disabled={status === 'busy'}>
            {status === 'pending' ? 'Запрос отправлен' : 'Добавить в контакты'}
          </button>
        )}
      </div>
      {error && <p className="form-error">{error}</p>}
    </Modal>
  )
}

export default ProfileModal