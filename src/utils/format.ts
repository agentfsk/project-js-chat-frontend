export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} Б`
  }
  const units = ['КБ', 'МБ', 'ГБ']
  let value = bytes / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  const rounded = Math.round(value * 10) / 10
  return `${rounded} ${units[unitIndex]}`
}

// A message that carries no usable timestamp renders without a time rather than
// with a wrong one, so callers can rely on an empty string meaning "unknown".
export function formatTime(iso: string | undefined): string {
  if (!iso) return ''
  const parsed = new Date(iso)
  const timestamp = parsed.getTime()
  if (Number.isNaN(timestamp)) return ''
  return parsed.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}