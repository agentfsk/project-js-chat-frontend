import React, { useEffect, useRef } from 'react'
import type { GroupCallParticipant } from './types'

interface ParticipantTileProps {
  participant: GroupCallParticipant
  isLocal: boolean
  layout: 'grid' | 'speaker'
  onClick?: () => void
  speakerScale?: number
  viewMode: 'grid' | 'speaker'
  speakerId: string | null
  stream?: MediaStream | null
}

export const ParticipantTile: React.FC<ParticipantTileProps> = ({
  participant,
  isLocal,
  layout,
  onClick,
  speakerScale = 1,
  viewMode,
  speakerId,
  stream,
}) => {
  const isSpeaking = participant.isSpeaking && !participant.isMuted
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isLocal || participant.isMuted
    }
  }, [isLocal, participant.isMuted, stream])

  const hasVideo = participant.isScreenSharing || participant.isCameraOn

  return (
    <div
      className={`participant-tile ${layout} ${isLocal ? 'local' : ''} ${viewMode === 'speaker' && participant.userId === speakerId ? 'speaker' : ''}`}
      style={{
        transform: `scale(${speakerScale})`,
      } as React.CSSProperties}
      onClick={onClick}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className="participant-video"
        style={{ objectFit: 'cover', display: hasVideo ? 'block' : 'none' } as React.CSSProperties}
      />
      {!hasVideo && (
        <div className="participant-avatar">
          {participant.avatarUrl ? (
            <img src={participant.avatarUrl} alt={participant.displayName} />
          ) : (
            <span>{participant.displayName[0]?.toUpperCase()}</span>
          )}
        </div>
      )}

      {isSpeaking && <div className="speaking-ring" />}

      <div className="participant-overlay">
        <div className="participant-info">
          <span className={`participant-name ${isLocal ? 'local' : ''}`}>
            {participant.displayName} {isLocal ? '(Вы)' : ''}
          </span>
          {participant.isSpeaking && <span className="speaking-indicator" />}
        </div>

        <div className="participant-controls">
          {participant.isMuted && <span className="control-icon" title="Микрофон выключен">🔇</span>}
          {!participant.isCameraOn && !participant.isScreenSharing && <span className="control-icon" title="Камера выключена">📷</span>}
          {participant.isScreenSharing && <span className="control-icon" title="Демонстрация экрана">🖥</span>}
          {participant.role === 'creator' && <span className="control-icon" title="Создатель">👑</span>}
        </div>
      </div>
    </div>
  )
}

const styles = `
.participant-tile {
  position: relative;
  background: #1a1d23;
  border-radius: 12px;
  overflow: hidden;
  flex: 1;
  min-width: 160px;
  min-height: 120px;
  border: 2px solid transparent;
  transition: border-color 0.2s;
}

.participant-tile.local {
  border-color: #00D4AA;
}

.participant-tile.speaker {
  flex: 1;
  min-width: 0;
  min-height: 0;
}

.participant-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.participant-avatar {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #2a2d35;
  color: #fff;
  font-size: 48px;
  font-weight: bold;
}

.participant-avatar img {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
}

.participant-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 8px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
}

.participant-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.participant-name {
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.participant-name.local {
  color: #00D4AA;
}

.speaking-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #00D4AA;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
}

.participant-controls {
  display: flex;
  gap: 8px;
  font-size: 12px;
}

.control-icon {
  opacity: 0.8;
}

.speaking-ring {
  position: absolute;
  inset: 0;
  border: 3px solid #00D4AA;
  border-radius: 12px;
  pointer-events: none;
  animation: ringPulse 1.5s infinite;
}

@keyframes ringPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.3; transform: scale(1.05); }
}
`

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = styles
  document.head.appendChild(styleSheet)
}