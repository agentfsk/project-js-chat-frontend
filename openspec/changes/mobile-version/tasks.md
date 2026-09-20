# Tasks

## 1. Theme palette and CSS variables

- [x] 1.1 Extract hardcoded colors in `src/index.css` into variables: add `--on-accent` (replaces avatar placeholder text `#1c1e26`) and `--hover` (replaces channel hover `rgba(255,255,255,0.04)`), each set in `:root`, and verify a grep finds no remaining `#1c1e26` or `rgba(255,255,255,0.04)` in the file
- [x] 1.2 Add a `[data-theme='light']` override block in `src/index.css` redefining `--bg`, `--panel`, `--text`, `--text-h`, `--border`, `--accent`, `--accent-bg`, `--on-accent` and setting `color-scheme: light`, and verify switching `data-theme="light"` on `<html>` renders the light palette

## 2. Theme store and toggle control

- [x] 2.1 Create `src/store/theme.ts` (zustand store, localStorage key `theme_pref`, default `'dark'`) whose `setTheme` writes storage and sets `document.documentElement.dataset.theme`, and verify it initializes from storage and updates the attribute
- [x] 2.2 Apply the persisted theme before the first render in `src/main.tsx` and verify a reload with the light theme shows no dark-background flash
- [x] 2.3 Create `src/components/ThemeToggle.tsx` (`.icon-btn` control showing a sun/moon glyph for the current theme, with a `title` attribute) that toggles the store, and verify it switches the `<html>` `data-theme` between `dark` and `light`
- [x] 2.4 Render `ThemeToggle` in the `ChatPage` `.chat-header-right` and at the top-right corner of `LoginPage`, and verify the control appears and works on both the login and chat screens

## 3. Responsive mobile layout

- [x] 3.1 Add a `@media (max-width: 700px)` block in `src/index.css` that turns `.channel-bar` into a `position: fixed` slide-in drawer with a backdrop (drawer/backdrop z-indexes above the chat area, below the modal overlay), and verify in devtools responsive mode that below 700px the sidebar is hidden and `.chat-main` fills the width
- [x] 3.2 Add a burger button to `.chat-header` (hidden on desktop via CSS, visible below 700px) with a `drawerOpen` state and backdrop-tap-to-close in `ChatPage`, and verify the burger opens the drawer and tapping the dimmed area closes it without changing the channel
- [x] 3.3 Add an `onNavigate` prop to `ChannelBar` invoked from every `setActiveChannel` call to close the drawer, and a `matchMedia('(max-width: 700px)')` listener in `ChatPage` that resets `drawerOpen` when resizing to desktop; verify selecting a channel closes the drawer and resizing past the breakpoint clears the state
- [x] 3.4 Apply responsive padding/size tweaks to `LoginPage` (and any `.chat-header` overflow on narrow widths) and verify no horizontal scrolling below 700px and the auth card stays centered
- [x] 3.5 Replace the «Отправить» submit button with a compact right-arrow icon on narrow screens (label kept on desktop) and stop the GIF/attach/emoji buttons from stretching by bottom-aligning `.message-form-row`; verify the form leaves more room for the textarea and the icon buttons sink with the textarea as it grows

## 4. Verification

- [x] 4.1 Run `npm run lint` and `npm run build` and verify both pass cleanly
- [ ] 4.2 Manual pass in `npm run dev`: dark theme on first visit, toggle to light persists across reload, desktop layout (>=700px) unchanged, and the mobile flow (burger opens drawer, channel select closes it, screen acts as chat-only below 700px) works