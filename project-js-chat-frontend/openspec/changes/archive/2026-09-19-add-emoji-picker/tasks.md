# Tasks

## 1. Data & index generation

- [x] 1.1 Add `emojibase-data` as a devDependency via `pnpm add -D emojibase-data` and create `scripts/build-emoji-index.mjs` that reads `en/compact.json` and `ru/compact.json` from `node_modules/emojibase-data`, converts `hexcode` to native characters, and filters to the configured Telegram-like set; verify `node scripts/build-emoji-index.mjs` runs and emits `src/data/emojiIndex.json`
- [x] 1.2 Verify the generated index: it has one entry per emoji with a native character, a category id with a per-section icon emoji, and a search term string that includes both English and Russian labels, and that the total count falls in the configured range (default ~1900, matching Telegram)
- [x] 1.3 Run `pnpm lint` and `pnpm build` and verify both pass with the index in place

## 2. Recent emoji storage

- [x] 2.1 Create `src/utils/recentEmoji.ts` with `getRecentEmojis()` / `addRecentEmoji(e)` persisting to `localStorage` key `emoji.recent`, and verify by scripting localStorage that adds are newest-first, duplicates collapse to one entry, and the list is capped at 30
- [ ] 2.2 Verify the stored list survives a full page reload (read back after writing in the dev app)

## 3. Emoji picker panel

- [ ] 3.1 Build `src/components/EmojiPicker.tsx` rendering the panel shell (search field, emoji grid, category tab strip) styled on existing CSS variables, positioned absolute above the composer input, and verify it renders with the default Smileys & People category
- [ ] 3.2 Implement close-on-outside-click (document `pointerdown` + ref check) and close-on-Escape listeners, and verify the panel closes without losing typed input in the composer
- [ ] 3.3 Render the category tab strip with an animated-toggle active tab and per-section emoji icons, ordered History → Smileys & People → remaining categories, History hidden while empty, and verify clicking each icon swaps the grid to that category
- [ ] 3.4 Implement the bilingual search over the generated term strings (case-insensitive `includes`, prefix matches first): verify typing «улыбка» shows smile emojis, typing "smile" shows the same, a no-match query shows an empty state, and clearing the query restores the active category
- [ ] 3.5 Wire the History tab to `recentEmoji`: show the picker's recently-used list as the first tab, update it after each pick, and verify the newest pick appears at the front and the tab populates/empties with the storage contents
- [ ] 3.6 Load the picker and the generated index via dynamic `import()` so they land in a separate chunk, and verify the main bundle load is unaffected and the picker opens after the chunk resolves

## 4. Composer integration

- [ ] 4.1 Add an emoji button to `src/components/MessageForm.tsx` next to the file and GIF buttons that toggles the panel, closing the GIF modal when the emoji panel opens and vice versa, and verify only one picker surface is open at a time
- [ ] 4.2 Implement cursor-aware insertion: on pick, splice the native emoji at the input's `selectionStart` (falling back to the end), keep surrounding text intact, and restore focus/caret in the input; verify typing before and after the cursor survives a pick and focus stays in the input for consecutive picks
- [ ] 4.3 Verify submitting a message with an inserted emoji sends it as plain text in `body` via the existing emit path, and the message renders the emoji in the list for a second browser tab

## 5. Verification

- [x] 5.1 Run `pnpm lint` and `pnpm build` and verify both pass
- [ ] 5.2 With the backend running on port 5001, run two `pnpm dev` browser tabs and verify end-to-end: search in Russian and English, switch categories by icon tabs, History order/cap/persistence across a reload, panel closes on outside click and Escape without losing typed text, and an emoji sent from one tab appears in the other with no backend changes