import { useEffect, useRef, useState } from 'react'
import { categories, DEFAULT_GROUP, searchEmoji } from '../data/emoji'
import { addRecentEmoji, getRecentEmojis } from '../utils/recentEmoji'

const HISTORY_TAB = 'recent'
const HISTORY_ICON = '🕒'
const HISTORY_LABEL = 'История'

type EmojiPickerProps = {
  onSelect: (emoji: string) => void
  onClose: () => void
}

type ActiveTab = typeof HISTORY_TAB | number

function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [recent, setRecent] = useState<string[]>(() => getRecentEmojis())
  const [active, setActive] = useState<ActiveTab>(
    () => recent.length > 0 ? HISTORY_TAB : DEFAULT_GROUP,
  )
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  const hasHistory = recent.length > 0
  const allTabs: ActiveTab[] = [
    ...(hasHistory ? ([HISTORY_TAB] as ActiveTab[]) : []),
    ...categories.map((category) => category.g),
  ]
  const categoryMeta = new Map(categories.map((category) => [category.g, category]))

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node | null
      if (rootRef.current?.contains(target)) return
      if (target instanceof Element && target.closest('[data-emoji-toggle]')) return
      onClose()
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  const trimmedQuery = query.trim()
  const searching = trimmedQuery !== ''
  const results = searching ? searchEmoji(trimmedQuery) : null

  const gridEmojis = searching
    ? (results?.map((row) => row.e) ?? [])
    : active === HISTORY_TAB
      ? recent
      : categoryMeta.get(active)?.emojis ?? []

  const handlePick = (emoji: string) => {
    onSelect(emoji)
    setRecent(addRecentEmoji(emoji))
  }

  return (
    <div className="emoji-picker" data-emoji-picker ref={rootRef}>
      <input
        className="emoji-search"
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Поиск эмодзи..."
        autoFocus
      />
      <div className="emoji-grid">
        {searching ? (
          results && results.length > 0 ? (
            results.map((row) => (
              <button
                key={row.e}
                type="button"
                className="emoji-cell"
                onClick={() => handlePick(row.e)}
              >
                {row.e}
              </button>
            ))
          ) : (
            <p className="emoji-empty">Ничего не найдено</p>
          )
        ) : (
          gridEmojis.map((emoji) => (
            <button key={emoji} type="button" className="emoji-cell" onClick={() => handlePick(emoji)}>
              {emoji}
            </button>
          ))
        )}
      </div>
      <div className="emoji-tabs" role="tablist">
        {allTabs.map((tab) => {
          const isHistory = tab === HISTORY_TAB
          const meta = isHistory
            ? { icon: HISTORY_ICON, label: HISTORY_LABEL }
            : categoryMeta.get(tab)
          if (!meta) return null
          return (
            <button
              key={String(tab)}
              type="button"
              className={`emoji-tab${active === tab ? ' active' : ''}`}
              role="tab"
              aria-selected={active === tab}
              title={meta.label}
              onClick={() => setActive(tab)}
            >
              {meta.icon}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default EmojiPicker