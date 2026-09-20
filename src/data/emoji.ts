import emojiIndex from './emojiIndex.json'

type EmojiCategory = {
  g: number
  icon: string
  label: string
  emojis: string[]
}

type EmojiRow = { e: string; t: string }

const CATEGORY_LABELS: Record<number, string> = {
  0: 'Смайлы и эмоции',
  1: 'Люди и тело',
  3: 'Животные и природа',
  4: 'Еда и напитки',
  5: 'Путешествия и места',
  6: 'Активности',
  7: 'Предметы',
  8: 'Символы',
  9: 'Флаги',
}

export const DEFAULT_GROUP = 0

export const REACTION_EMOJIS = ['👍', '❤️', '😂', '🔥', '👏', '😮', '😢', '🎉']

export const categories: EmojiCategory[] = emojiIndex.categories.map((category) => ({
  g: category.g,
  icon: category.icon,
  label: CATEGORY_LABELS[category.g] ?? `Категория ${category.g}`,
  emojis: category.emojis,
}))

function sortPrefixFirst(rows: EmojiRow[], query: string): EmojiRow[] {
  return rows.slice().sort((a, b) => Number(b.t.startsWith(query)) - Number(a.t.startsWith(query)))
}

export function searchEmoji(query: string): EmojiRow[] {
  const normalized = query.trim().toLowerCase()
  if (normalized === '') return []
  const matches = emojiIndex.search.filter((row) => row.t.includes(normalized))
  return sortPrefixFirst(matches, normalized)
}