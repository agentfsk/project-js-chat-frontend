import React from 'react'
import type { GroupCallMode } from '../groupCall/types'

interface GroupCallBannerProps {
  mode: GroupCallMode
  onJoin: () => void
}

export const GroupCallBanner: React.FC<GroupCallBannerProps> = ({ mode, onJoin }) => {
  return (
    <div className="group-call-banner">
      <div className="banner-content">
        <div className="banner-icon">
          {mode === 'video' ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="8" y1="22" x2="16" y2="22" />
            </svg>
          )}
        </div>
        <div className="banner-text">
          <strong>Активный {mode === 'video' ? 'видео чат' : 'голосовой чат'}</strong>
          <span>Нажмите, чтобы присоединиться</span>
        </div>
      </div>
      <button className="banner-join-btn" onClick={onJoin}>
        Присоединиться
      </button>
    </div>
  )
}