import { useState } from 'react'
import Modal from './Modal'

type ConfirmDialogProps = {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onSubmit: () => void | Promise<void>
  onClose: () => void
}

// Generic yes/no confirmation used by kick and group deletion.
function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Да',
  cancelLabel = 'Нет',
  onSubmit,
  onClose,
}: ConfirmDialogProps) {
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
    <Modal title={title} onClose={onClose}>
      <p className="modal-text">{message}</p>
      <div className="modal-actions">
        <button type="button" onClick={onClose}>
          {cancelLabel}
        </button>
        <button type="button" className="danger-btn" onClick={() => void handleSubmit()} disabled={submitting}>
          {submitting ? '...' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

export default ConfirmDialog