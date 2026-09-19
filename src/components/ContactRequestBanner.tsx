import { useState } from 'react'
import { useUsersStore } from '../store/users'
import { resolveContactRequest } from '../api/users'
import type { ContactRequest } from '../types'

type ContactRequestBannerProps = {
  request: ContactRequest
}

function ContactRequestBanner({ request }: ContactRequestBannerProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleResolve = async (action: 'accept' | 'decline') => {
    setBusy(true)
    setError(null)
    try {
      await resolveContactRequest(request.id, action)
      const users = useUsersStore.getState()
      users.removeRequest(request.id)
      if (action === 'accept') {
        users.addContact(request.from)
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось обработать запрос')
      setBusy(false)
    }
  }

  return (
    <div className="contact-banner">
      <span>
        Пользователь <strong>{request.from.username}</strong> хочет добавить вас в контакты
      </span>
      <div className="contact-banner-actions">
        <button type="button" onClick={() => void handleResolve('accept')} disabled={busy} title="Принять">
          ✓
        </button>
        <button
          type="button"
          onClick={() => void handleResolve('decline')}
          disabled={busy}
          title="Отклонить"
          className="danger-btn"
        >
          ✕
        </button>
      </div>
      {error && <span className="form-error">{error}</span>}
    </div>
  )
}

export default ContactRequestBanner