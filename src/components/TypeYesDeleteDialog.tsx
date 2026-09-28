import { useState } from 'react'
import Modal from './Modal'

type TypeYesDeleteDialogProps = {
  title: string
  message: string
  onSubmit: () => void | Promise<void>
  onClose: () => void
}

// Final gate before a group is destroyed: the user has to type "Yes" exactly.
function TypeYesDeleteDialog({ title, message, onSubmit, onClose }: TypeYesDeleteDialogProps) {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const confirmed = text === 'Yes'

  const handleSubmit = async () => {
    if (!confirmed || submitting) return
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
      <input
        autoFocus
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Yes"
      />
      <div className="modal-actions">
        <button type="button" onClick={onClose}>
          Отмена
        </button>
        <button
          type="button"
          className="danger-btn"
          onClick={() => void handleSubmit()}
          disabled={!confirmed || submitting}
        >
          {submitting ? 'Удаляем...' : 'Удалить'}
        </button>
      </div>
    </Modal>
  )
}

export default TypeYesDeleteDialog