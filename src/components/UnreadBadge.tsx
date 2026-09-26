type UnreadBadgeProps = {
  count: number
}

function UnreadBadge({ count }: UnreadBadgeProps) {
  if (count <= 0) return null
  return (
    <span className="unread-badge" aria-label={`${count} непрочитанных`}>
      {count > 99 ? '99+' : count}
    </span>
  )
}

export default UnreadBadge
