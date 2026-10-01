import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUTPUT_PATH = join(root, 'src/data/emojiIndex.json')

// Configured Telegram-like set: emojibase "compact" dataset (~1,900 emoji after
// filtering), which matches Telegram's picker quantity. Tunable knobs:
// - EXCLUDED_GROUPS drops skin-tone components and bare regional letters.
// - MIN_EMOJI_VERSION keeps only emoji added at or after the given Unicode
//   version (0 keeps everything).
const EXCLUDED_GROUPS = new Set([2])
const MIN_EMOJI_VERSION = 0

const GROUP_ORDER = [0, 1, 3, 4, 5, 6, 7, 8, 9]
const GROUP_ICONS = {
  0: '😀',
  1: '🙋',
  3: '🐶',
  4: '🍕',
  5: '✈️',
  6: '⚽',
  7: '💡',
  8: '💬',
  9: '🚩',
}

const en = JSON.parse(readFileSync(join(root, 'node_modules/emojibase-data/en/compact.json'), 'utf8'))
const ru = JSON.parse(readFileSync(join(root, 'node_modules/emojibase-data/ru/compact.json'), 'utf8'))
const ruByHex = new Map(ru.map((item) => [item.hexcode, item]))

const byEmoji = new Map()
for (const item of en) {
  if (!item.unicode) continue
  if (item.group === undefined || EXCLUDED_GROUPS.has(item.group)) continue
  if ((item.emoji_version ?? 0) < MIN_EMOJI_VERSION) continue
  if (byEmoji.has(item.unicode)) continue

  const russian = ruByHex.get(item.hexcode)
  const terms = [
    item.label,
    ...(item.tags ?? []),
    russian?.label,
    ...(russian?.tags ?? []),
  ]
    .filter(Boolean)
    .map((term) => term.toLowerCase())
  const uniqueTerms = [...new Set(terms)]
  byEmoji.set(item.unicode, { emoji: item.unicode, group: item.group, order: item.order, terms: uniqueTerms.join(' ') })
}

const rows = [...byEmoji.values()].sort((a, b) => a.order - b.order)

const categories = GROUP_ORDER.map((group) => ({
  g: group,
  icon: GROUP_ICONS[group],
  emojis: rows.filter((row) => row.group === group).map((row) => row.emoji),
}))
const search = rows.map(({ emoji, terms }) => ({ e: emoji, t: terms }))

mkdirSync(dirname(OUTPUT_PATH), { recursive: true })
writeFileSync(OUTPUT_PATH, `${JSON.stringify({ categories, search }, null, 0)}\n`, 'utf8')

console.log(`emoji index: ${search.length} emoji, ${categories.length} categories -> ${OUTPUT_PATH}`)