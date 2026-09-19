import { resolveMediaUrl } from '../utils/mediaUrl'

type AvatarProps = {
  username: string
  src?: string | null
  size?: number
}

function Avatar({ username, src, size = 28 }: AvatarProps) {
  const initial = username.trim().charAt(0).toUpperCase() || '?'
  const resolvedSrc = resolveMediaUrl(src)

  if (resolvedSrc) {
    return (
      <img
        className="avatar avatar-img"
        src={resolvedSrc}
        alt={username}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <span
      className="avatar avatar-placeholder"
      style={{ width: size, height: size, fontSize: Math.round(size / 2) }}
    >
      {initial}
    </span>
  )
}

export default Avatar