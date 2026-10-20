import { useMemo } from 'react'
import { useCallStore } from '../store/calls'
import { formatSafetyNumber, generateQRCodeSVG } from '../crypto/safetyNumber'

interface SafetyNumberModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SafetyNumberModal({ isOpen, onClose }: SafetyNumberModalProps) {
  const { safetyNumber, peer } = useCallStore()

  if (!isOpen || !safetyNumber) return null

  const formatted = useMemo(() => formatSafetyNumber(safetyNumber), [safetyNumber])
  const qrData = useMemo(() => `messenger://verify?fp=${safetyNumber.toString(16).padStart(15, '0')}&user=${peer?.username || ''}`, [safetyNumber, peer?.username])
  const qrSvg = useMemo(() => generateQRCodeSVG(qrData, 200), [qrData])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Safety Number</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-peer">
          <p className="modal-peer-label">Verifying with</p>
          <p className="modal-peer-name">{peer?.username || 'Unknown'}</p>
        </div>

        <div className="modal-qr">
          <div dangerouslySetInnerHTML={{ __html: qrSvg }} />
        </div>

        <div className="modal-number-container">
          <p className="modal-number-label">Safety Number</p>
          <p className="modal-number-value">{formatted}</p>
        </div>

        <p className="modal-instructions">
          Compare this number with your contact. If they match, your call is end-to-end encrypted.
        </p>

        <button className="modal-verify-button" onClick={() => { alert('Contact marked as verified'); onClose(); }}>
          Mark as Verified
        </button>
      </div>
    </div>
  )
}