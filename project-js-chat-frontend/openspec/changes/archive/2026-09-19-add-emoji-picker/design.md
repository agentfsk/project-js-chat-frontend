# Design

## Context

The composer (`src/components/MessageForm.tsx`) already has attachment and GIF buttons; emoji is the natural third. Messages are plain text — `body: string`, optional `attachment` — so emoji travel as Unicode characters in `body` with zero backend/Socket.IO changes.

Relevant repo facts that shape the approach:
- `GifPicker` is the only existing picker, and it is a centered modal `Modal`; there is **no popover / click-outside pattern** anywhere yet.
- Recommitment to local UI state via `useState` is the norm for one-off panels; `zustand` stores are reserved for state shared across components.
- `src/index.css` is plain CSS with variables (`--panel`, `--border`, `--accent`, `--bg`, `--text`, `--text-h`), no UI framework.
- Vite + TypeScript strict; `oxlint`; existing manual-verification style tasks.

## Goals / Non-Goals

**Goals:**
- Telegram-feel picker: panel above the input, category tab strip with icons, History section first, default Smileys & People pack, native-text insertion.
- Bilingual (Russian + English) search with ~Telegram's set size.
- Keep the shipped bundle lean by precomputing one emoji index at build time.
- No backend, API, or realtime protocol changes.

**Non-Goals:**
- Skin-tone variant selection (Telegram's long-press menu) — default skin tone only.
- Image-based rendering (Twemoji) — native OS emoji fonts.
- Cross-device History sync via the backend — `localStorage` only.
- Sending an emoji on pick — a pick only inserts text; submit is unchanged.

## Decisions

### 1. Emoji dataset: `emojibase-data` (en + ru), merged into a committed build-time index

`emojibase-data` is the only checked dataset with a Russian locale (`ru/compact.json` ships labels in Russian; `en/compact.json` adds English labels, tags, shortcodes). Alternatives rejected:
- `@emoji-mart/data` — rich keywords but English-only, fails the bilingual requirement.
- `unicode-emoji-json` — English-only single names.

A generator `scripts/build-emoji-index.mjs` (run manually, output committed, so neither the two large JSON datasets nor the CLI hook land anywhere near the app) produces `src/data/emojiIndex.json`:

```json
{
  "categories": [
    { "id": 0, "icon": "😀", "emojis": ["😀", "😁", "..."] }
  ],
  "search": [
    { "e": "😀", "t": "grinning face smile улыбающееся лицо ..." }
  ]
}
```

- `hexcode` → native character conversion happens in the script (emojibase stores codepoints, not glyphs).
- Terms are pre-lowercased and joined into one string per emoji at generation time, so runtime search is a single `includes` per row — no per-keystroke normalization.
- Quantity: filter to Telegram-like size by keeping the main set (the emojibase "compact" dataset, minus skin-tone components and bare regional letters). The measured default is ~1900 emoji, squarely matching Telegram's picker scale; an optional Unicode-version cutoff is the tunable knob in the script.

### 2. Picker container: panel above the input, not a modal

Unlike `GifPicker`, the picker is `position: absolute; bottom: 100%` inside the composer (`relative`), height ~400px, overlay on top of the message area. This keeps the input visible and makes insertion tangible, like Telegram. Because the repo has no popover primitive, the close affordances are implemented directly:
- click-outside via a document `pointerdown` listener checking a ref;
- `Escape` via a keydown listener (closing without losing typed input).

### 3. Category tabs with emoji-as-icon badges

A horizontal, scrollable strip at the panel's bottom (Telegram-style tabs as scrollable on narrow widths). Each tab's icon is a representative emoji per section — zero asset work. Order: History first (hidden while empty), then Smileys & People as the default, then the remaining emojibase groups. Active tab highlighted with `--accent`.

### 4. Search: in-memory, immediate, prefix-prioritized

The index payload is small and fully in memory once loaded, so no debounce (unlike `GifPicker`, which needs 300 ms for the GIPHY network). Matching is `t.includes(query)` on the precomputed lowercase terms; results whose term starts with the query sort first. The search field replaces the grid contents while a query is non-empty; clearing restores the active category.

### 5. Recent emojis: plain module + component state over `localStorage`

`src/utils/recentEmoji.ts` exposes `getRecentEmojis()`, `addRecentEmoji(e)` around the `emoji.recent` key — cap 30, dedupe, newest-first. The picker keeps its own `useState` copy, refreshed when it opens and updated per pick. No `zustand` store and no cross-component state are warranted: only the picker reads it.

### 6. Integration: lazy-load the picker, insert at cursor

The picker component and the generated index are loaded via dynamic `import()` when the emoji button is first clicked, so the emoji payload is a separate chunk from the main bundle. `MessageForm` owns an `inputRef`; on select it splices the emoji at `selectionStart` (falling back to the end), restores focus and caret, and re-renders the controlled value. The emoji button toggles the panel and closes the GIF/attachment popovers implicitly by being a single open choice at a time.

## Risks / Trade-offs

- **Set size vs. Telegram parity** → count is a generation knob, not a code change; default in range, tunable with one constant.
- **Generated index chunk size** → ~150–250 KB gzipped; acceptable because it only loads in the chat screen on first picker open (dynamic import).
- **OS-dependent emoji rendering** → native fonts vary across systems; this is exactly how emoji already render in sent messages, so the picker and the chat stay consistent.
- **First click-outside pattern in the codebase** → scoped to one small component; if it proves reusable later it can be extracted, which is deliberately deferred.

## Migration Plan

Additive, frontend-only. No data migration, no backend rollout. Rollback is reverting the change commit — the emoji button disappears and message history is unaffected (emojis already sent remain plain text).

## Open Questions

None — the set-size knob and default behavior are decided; any refinement is a constant tweak in the generator, not a spec or task change.