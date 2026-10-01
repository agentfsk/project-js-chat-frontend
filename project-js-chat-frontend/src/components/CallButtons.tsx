import type { CallMode, UserProfile } from '../types'

type CallButtonsProps = {
  peer: UserProfile
  disabled: boolean
  onCall: (mode: CallMode) => void
}

function CallButtons({ peer, disabled, onCall }: CallButtonsProps) {
  return (
    <div className="call-buttons">
      <button
        type="button"
        className="icon-btn call-btn"
        aria-label={`Позвонить ${peer.username}`}
        title="Позвонить"
        disabled={disabled}
        onClick={() => onCall('audio')}
      >
        📞
      </button>
      <button
        type="button"
        className="icon-btn call-btn"
        aria-label={`Видеозвонок ${peer.username}`}
        title="Видеозвонок"
        disabled={disabled}
        onClick={() => onCall('video')}
      >
        🎥
      </button>
    </div>
  )
}

export default CallButtons