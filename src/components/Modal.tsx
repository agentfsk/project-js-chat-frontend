import type { ReactNode } from 'react'

type ModalProps = {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}

function Modal({ title, onClose, children, wide = false }: ModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal${wide ? ' modal-wide' : ''}`} onClick={(event) => event.stopPropagation()}>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  )
}

export default Modal