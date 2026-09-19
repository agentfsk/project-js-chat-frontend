const STORAGE_KEY = 'emoji.recent'
const MAX_RECENT = 30

export function getRecentEmojis(): string[] {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item): item is string => typeof item === 'string')
      .slice(0, MAX_RECENT)
  } catch {
    return []
  }
}

export function addRecentEmoji(emoji: string): string[] {
  const next = [emoji, ...getRecentEmojis().filter((item) => item !== emoji)].slice(0, MAX_RECENT)
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // storage unavailable (private mode / quota); history stays in-memory
  }
  return next
}