import React, { useMemo } from 'react'
import type { GroupCallParticipant } from './types'

interface GroupCallParticipantsSidebarProps {
  isOpen: boolean
  onClose: () => void
  participants: GroupCallParticipant[]
  localUserId: string | undefined
  isCreator: boolean
}

interface ParticipantRowProps {
  participant: GroupCallParticipant
  isLocal: boolean
  canManage: boolean
  onMute: (userId: string) => void
  onKick: (userId: string) => void
}

const ParticipantRow: React.FC<ParticipantRowProps> = ({
  participant,
  isLocal,
  canManage,
  onMute,
  onKick,
}) => (
  <div key={participant.userId} className="participant-row">
    <div className="participant-avatar">
      {participant.avatarUrl ? (
        <img src={participant.avatarUrl} alt={participant.displayName} />
      ) : (
        <div className="participant-avatar-placeholder">
          {participant.displayName[0]?.toUpperCase()}
        </div>
      )}
      {participant.isSpeaking && <span className="speaking-indicator" />}
    </div>

    <div className="participant-info">
      <div className="participant-name">{participant.displayName} {isLocal ? '(Вы)' : ''}</div>
      <div className="participant-status">
        {participant.isMuted && <span className="status-badge">🔇 Заглушен</span>}
        {!participant.isCameraOn && !participant.isScreenSharing && <span className="status-badge">📷 Камера выкл</span>}
        {participant.isScreenSharing && <span className="status-badge-screen">🖥 Демонстрация экрана</span>}
      </div>
    </div>

    {canManage && (
      <div className="participant-actions">
        <button
          className="action-btn"
          onClick={() => onMute(participant.userId)}
          title={participant.isMuted ? 'Включить звук' : 'Заглушить'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
            <line x1="8" y1="22" x2="16" y2="22" />
            {!participant.isMuted && <line x1="5" y1="5" x2="19" y2="19" />}
          </svg>
        </button>
        <button className="action-btn danger" onClick={() => onKick(participant.userId)} title="Исключить">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </button>
      </div>
    )}
  </div>
)

export const GroupCallParticipantsSidebar: React.FC<GroupCallParticipantsSidebarProps> = ({
  isOpen,
  onClose,
  participants,
  localUserId,
  isCreator,
}) => {
  if (!isOpen) return null

  const handleMuteParticipant = (userId: string) => {
    console.log('Mute participant:', userId)
  }

  const handleKickParticipant = (userId: string) => {
    console.log('Kick participant:', userId)
  }

  const renderedParticipants = useMemo(
    () => participants.map(p => (
      <ParticipantRow
        key={p.userId}
        participant={p}
        isLocal={p.userId === localUserId}
        canManage={isCreator && p.userId !== localUserId}
        onMute={handleMuteParticipant}
        onKick={handleKickParticipant}
      />
    )),
    [participants, localUserId, isCreator]
  )

  return (
    <div className="group-call-participants-sidebar" role="dialog" aria-label="Участники звонка">
      <div className="participants-sidebar-header">
        <h3>Участники ({participants.length})</h3>
        <button className="close-btn" onClick={onClose} aria-label="Закрыть">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="participants-list">
        {renderedParticipants}
      </div>
    </div>
  )
}