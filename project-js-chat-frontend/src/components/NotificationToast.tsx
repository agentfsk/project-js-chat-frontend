import { useEffect } from 'react'
import { useChatStore } from '../store/chat'
import { useUsersStore } from '../store/users'
import { TOAST_TTL_MS, useToastStore, type Toast } from '../store/toasts'
import Avatar from './Avatar'

type NotificationToastProps = {
  onOpenChannel: (channelId: number) => void
}

type ToastItemProps = {
  toast: Toast
  title: string
  avatarUrl: string | null
  onOpen: () => void
}

// Each notice owns its lifetime so a burst does not keep the oldest one alive by
// resetting every timer on each new arrival.
function ToastItem({ toast, title, avatarUrl, onOpen }: ToastItemProps) {
  const dismiss = useToastStore((state) => state.dismiss)

  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(toast.id), TOAST_TTL_MS)
    return () => window.clearTimeout(timer)
  }, [toast.id, dismiss])

  return (
    <button type="button" className="toast" onClick={onOpen}>
      {avatarUrl !== null && <Avatar username={toast.sender} src={avatarUrl} size={32} />}
      <span className="toast-text">
        <span className="toast-head">
          <span className="toast-sender">{toast.sender}</span>
          {title && <span className="toast-title">{title}</span>}
        </span>
        {toast.preview && <span className="toast-preview">{toast.preview}</span>}
      </span>
    </button>
  )
}

function NotificationToast({ onOpenChannel }: NotificationToastProps) {
  const toasts = useToastStore((state) => state.toasts)
  const channels = useChatStore((state) => state.channels)
  const me = useUsersStore((state) => state.me)
  const profiles = useUsersStore((state) => state.profiles)

  if (toasts.length === 0) return null

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => {
        const channel = channels.find((candidate) => candidate.id === toast.channelId)
        const peerId = channel?.participants?.find((id) => id !== me?.id)
        const peer = peerId !== undefined ? profiles[peerId] : undefined
        const title = channel
          ? channel.private
            ? peer?.username ?? channel.name
            : `#${channel.name}`
          : ''
        return (
          <ToastItem
            key={toast.id}
            toast={toast}
            title={title}
            avatarUrl={channel?.private ? peer?.avatarUrl ?? null : null}
            onOpen={() => onOpenChannel(toast.channelId)}
          />
        )
      })}
    </div>
  )
}

export default NotificationToast
