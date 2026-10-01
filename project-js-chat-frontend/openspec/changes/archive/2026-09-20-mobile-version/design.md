# Design

## Context

Single-page app (React 19 + TypeScript + Vite, zustand, socket.io). `App.tsx` switches between `LoginPage` (centered 380px auth card) and `ChatPage`. `ChatPage` is `.chat-page` (flex column): `.chat-header` on top, `.chat-body` (flex row) with a 220px `.channel-bar` sidebar and `.chat-main` (channel title, message list, message form). `ChannelBar.tsx` owns the sidebar content and inline modals (create/rename/remove channel, view profile). All styles live in `src/index.css` (744 lines, modern CSS nesting), and the dark palette is expressed as CSS variables in `:root` with `color-scheme: dark`; a few hardcoded values remain (avatar placeholder text `#1c1e26`, channel hover `rgba(255,255,255,0.04)`). There are no media queries. `src/store/auth.ts` shows the project's storage pattern: zustand + manual `localStorage` (no persist middleware). See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Break the chat layout at 700px viewport width: desktop layout unchanged at ≥700px; below that a chat-only screen with the channel sidebar as a slide-in drawer.
- Add a light theme toggled by an icon control available on the login page and the chat header; dark remains default; choice persists and applies before first paint.

**Non-Goals:**
- No User-Agent / referrer detection — adaptation is purely viewport-driven (per decision with the user).
- No separate mobile page or duplication of components; ChannelBar is reused, styling switches it between sidebar and drawer.
- No `prefers-color-scheme` system-theme syncing; the default is explicitly dark.
- No redesign of the desktop layout, message list, or chat features.

## Decisions

### D1: Layout switched by a single CSS media query, plus minimal drawer state
A `@media (max-width: 700px)` block restyles `.channel-bar` as a `position: fixed` left drawer (slide via `transform: translateX`, shadow, own stacking context) and hides nothing structurally. The only React addition is an open/close flag for the drawer.

Why: keeps desktop markup and behavior untouched, all visual adaptation stays in CSS, and only the drawer visibility needs state.

Alternatives: rendering a separate mobile component tree (rejected — duplicates markup and event handling), or JS-driven breakpoints (rejected — CSS media queries are the standard, reliable mechanism).

### D2: Drawer state lives in ChatPage and closes on navigation
`ChatPage` holds `drawerOpen` state. A burger button in `.chat-header` (always in the DOM, CSS hides it on desktop) toggles it; a `.drawer-backdrop` element rendered while open closes it on tap. `ChannelBar` accepts an optional `onNavigate` callback invoked from every `setActiveChannel` call, so selecting a channel from the drawer closes it. Search-result profile clicks do not navigate and leave the drawer open.

Why: no store needed for UI-only state; the callback keeps ChannelBar's internal navigation logic untouched.

### D3: Drawer closes when resizing back to desktop
A `matchMedia('(max-width: 700px)')` listener in `ChatPage` resets `drawerOpen` to `false` when the viewport grows past the breakpoint, preventing a stale open flag on desktop.

### D4: Light theme is a `[data-theme='light']` variable override on `<html>`
`src/index.css` keeps `:root` variables as the dark palette and adds a `[data-theme='light']` block redefining the same variables (`--bg`, `--panel`, `--text`, `--text-h`, `--border`, `--accent`, `--accent-bg`, plus `color-scheme: light`). Shared tokens are extracted into variables so no component carries theme-specific hex values: `--on-accent` (text on accent backgrounds) and `--hover` (row hover tint) replace the two hardcoded values, each themed per block.

Why: the app is already fully themed through variables, so a light appearance is one overrides block and two extra tokens — no component changes needed for color.

Alternative considered: separate light CSS file (rejected — fragments the palette that already lives in one place).

### D5: Theme choice persisted through a zustand store, applied before render
New `src/store/theme.ts` follows the `auth.ts` pattern: reads `localStorage` (key `theme_pref`) on store creation, `setTheme` writes storage and sets `document.documentElement.dataset.theme`. `main.tsx` sets `data-theme` from storage before `createRoot(...).render()` to avoid a flash for light-theme users; the server-less default is the dark `:root`, so first-time visitors get dark instantly.

Why: matches the project's existing state pattern (no persist middleware), and a pre-render setup removes FOUC.

### D6: Single reusable ThemeToggle component
New `src/components/ThemeToggle.tsx`: an `.icon-btn` rendering a sun/moon glyph (or inline SVG) according to the current theme, with a `title` for accessibility. Used in `ChatPage` `.chat-header-right` and at the top-right corner of `LoginPage`. No props needed — it reads the store itself.

## Risks / Trade-offs

- [Stale drawer flag after resizing to desktop] → Clear it via the `matchMedia` listener (D3).
- [Z-index stacking with modals and pickers] → Drawer and backdrop sit in a z-index band above the chat area; modals inside `ChannelBar` render within the drawer's stacking context and stay above it. Mitigation: assign z-indexes in one place in `index.css` and verify emoji/GIF pickers (z-index 5, chat area) never overlap an open drawer.
- [Light-theme accent contrast] → Accent shifts to a darker violet (`#7c3aed`); `--on-accent` flips per theme (dark text on the light-dark accent, white text on the darker light-theme accent). Verify avatar placeholder and active-row readability in both themes during implementation.
- [FOUC of theme on load] → Applied in `main.tsx` before render (D5).
- [Mobile keyboard may cover the message form on short viewports] → Accepted for now; header/input are visible when typing because the form sits above the keyboard on most phones. `visualViewport` handling is out of scope.

## Migration Plan

Pure client-side change; no backend, schema, or dependency changes. Deploy as a normal frontend release; rollback is reverting the commit (or the CSS/component state reverts independently — the two features don't depend on each other).

## Open Questions

- Exact light-accent shade and the breakpoint value (700px) are tuning details that can be adjusted during implementation without changing specs or approach.