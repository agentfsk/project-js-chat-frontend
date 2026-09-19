# Proposal

## Why

Users can already send text, files, and GIFs, but there is no way to send emojis. Telegram's emoji panel is the reference for both the feel and the size of the set, and adding one makes the composer feel complete.

## What Changes

- Add an emoji button to the message composer that toggles a picker panel above the input (Telegram-style, not a modal).
- Add the emoji picker: a search field on top, a grid of emojis for the active category in the middle, and a bottom strip of category tabs with icon badges; the search field replaces the grid contents while active.
- Order tabs Telegram-style: a "History" tab with previously used emojis first, the default "Smileys & People" pack, then the remaining categories (People & Body, Animals & Nature, Food & Drink, Travel & Places, Activities, Objects, Symbols, Flags). Category tab icons are a representative emoji per section.
- Emojis are inserted as native Unicode characters into the message text at the cursor position; a pick only inserts text, sending still happens through the existing composer submit. **No backend change**: emoji messages travel as plain `body` text.
- Persist recently used emojis in `localStorage` (capped, deduplicated, newest first) and surface them in the History tab.
- Search emojis by BOTH Russian and English terms by generating a single build-time index from `emojibase-data` `en` and `ru` locale data; the generated index (not the raw datasets) is what ships.
- Approximate Telegram's set quantity by filtering the generated index to the main emoji set rather than shipping every variant.

## Capabilities

### New Capabilities
- `emoji`: Let the user pick emojis from a Telegram-like panel in the composer — a category tab strip with icons, a History tab of previously used emojis, native-text insertion into the message body, and a bilingual (Russian + English) search.

### Modified Capabilities
- None. Emoji messages are already representable as plain text `body` by the `chat` capability; `chat`, `gif`, and `initial-screen` specs are unchanged.

## Impact

- **Code**: new `src/components/EmojiPicker.tsx` and `src/components/EmojiCategoryTabs.tsx` (or equivalent); `src/components/MessageForm.tsx` gets the emoji button and cursor-aware text insertion; new `src/utils/recentEmoji.ts`; new search/index module (`src/store/emojiSearch.ts` or `src/data/emoji.ts`); generated `src/data/emojiIndex.json`; one-off generator `scripts/build-emoji-index.mjs`; `src/index.css` extended with picker layout on existing CSS variables.
- **API**: none; no backend or Socket.IO changes.
- **Dependencies**: adds `emojibase-data` as a devDependency (consumed only by the committed-index generator, not bundled).
- **Config**: `tsconfig.app.json` gains `resolveJsonModule` to import the generated index; `vite.config.ts` unchanged.