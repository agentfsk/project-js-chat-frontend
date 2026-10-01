import { useState } from 'react'
import Modal from './Modal'
import type { Channel } from '../types'

type RemoveChannelModalProps = {
  channel: Channel
  onSubmit: () => Promise<void>
  onClose: () => void
}

function RemoveChannelModal({ channel, onSubmit, onClose }: RemoveChannelModalProps) {
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      await onSubmit()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Удалить канал" onClose={onClose}>
      <p className="modal-text">
        Удалить канал «{channel.name}»? Все сообщения будут удалены.
      </p>
      <div className="modal-actions">
        <button type="button" onClick={onClose}>
          Отмена
        </button>
        <button type="button" className="danger-btn" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Удаляем...' : 'Удалить'}
        </button>
      </div>
    </Modal>
  )
}

export default RemoveChannelModal