import type { Message } from '../types'

type PinnedMessageBannerProps = {
  message: Message | null
  onNavigate: () => void
}

function PinnedMessageBanner({ message, onNavigate }: PinnedMessageBannerProps) {
  if (!message) return null
  const text = message.body || message.attachment?.name || 'Вложение'
  return (
    <button type="button" className="pinned-banner" onClick={onNavigate} title="Перейти к сообщению">
      <svg className="pinned-banner-pin" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M16 9V4h1a1 1 0 0 0 0-2H7a1 1 0 0 0 0 2h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z" />
      </svg>
      <span className="pinned-banner-text">{text}</span>
    </button>
  )
}

export default PinnedMessageBanner