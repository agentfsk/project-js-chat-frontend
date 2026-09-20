import type { ReactNode } from 'react'

type ModalProps = {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
  bare?: boolean
}

function Modal({ title, onClose, children, wide = false, bare = false }: ModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal${wide ? ' modal-wide' : ''}`}
        data-bare={bare || undefined}
        onClick={(event) => event.stopPropagation()}
      >
        {!bare && <h3>{title}</h3>}
        {children}
      </div>
    </div>
  )
}

export default Modal