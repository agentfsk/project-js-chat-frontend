import { type FormEvent, useState } from 'react'
import Modal from './Modal'

type ChannelInputModalProps = {
  title: string
  initialName?: string
  submitLabel: string
  onSubmit: (name: string) => Promise<void>
  onClose: () => void
}

function ChannelInputModal({
  title,
  initialName = '',
  submitLabel,
  onSubmit,
  onClose,
}: ChannelInputModalProps) {
  const [name, setName] = useState(initialName)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim() || submitting) return
    setSubmitting(true)
    try {
      await onSubmit(name)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <input
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Название канала"
        />
        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" disabled={submitting || !name.trim()}>
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default ChannelInputModal