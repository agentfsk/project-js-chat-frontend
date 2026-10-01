import type { StorageAdapter } from '../storage'

const STORAGE_KEY = 'emoji.recent'
const MAX_RECENT = 30

export async function getRecentEmojis(storage: StorageAdapter): Promise<string[]> {
  const raw = await storage.getItem(STORAGE_KEY)
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

export async function addRecentEmoji(storage: StorageAdapter, emoji: string): Promise<string[]> {
  const recent = await getRecentEmojis(storage)
  const next = [emoji, ...recent.filter((item) => item !== emoji)].slice(0, MAX_RECENT)
  try {
    await storage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // storage unavailable; history stays in-memory for this session
  }
  return next
}