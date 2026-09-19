type AvatarProps = {
  username: string
  src?: string | null
  size?: number
}

function Avatar({ username, src, size = 28 }: AvatarProps) {
  const initial = username.trim().charAt(0).toUpperCase() || '?'

  if (src) {
    return (
      <img
        className="avatar avatar-img"
        src={src}
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