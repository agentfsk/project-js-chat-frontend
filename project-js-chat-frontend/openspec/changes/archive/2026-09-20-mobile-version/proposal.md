# Proposal

## Why

The frontend is a desktop-only layout: users opening the site from a phone (for example, following a link from a messenger) get a cramped, unusable interface, and there is no way to switch to a lighter theme. The app should adapt to the device and let users pick a theme, with dark as the default.

## What Changes

- Introduce a responsive layout: on wide screens the existing desktop layout stays as-is; on narrow screens (breakpoint ~700px) the channel bar becomes a slide-in drawer reachable from a burger button in the header, so channel switching works on a phone.
- Add a light theme alongside the existing dark one, controlled by a theme toggle icon available on both the login page and the chat header. Dark remains the default; the choice persists across sessions.
- Factor the few hardcoded colors in `index.css` into CSS variables so both themes are expressed purely through variables.
- Apply the persisted theme before the first render to avoid a flash of the wrong background.

## Capabilities

### New Capabilities
- `responsive-layout`: the frontend adapts its page layout to the viewport width, showing the desktop layout on wide screens and a drawer-based mobile layout on narrow screens.
- `theme`: the frontend supports a dark (default) and a light theme, lets the user toggle between them from any screen, and persists the choice.

### Modified Capabilities
<!-- None: no existing spec-level behavior changes. -->

## Impact

- `src/index.css` — media query for the mobile layout; `[data-theme='light']` variable overrides; new shared variables; minor responsive touches to the login page.
- `src/pages/ChatPage.tsx` — mobile drawer open/close state, burger button in the header, theme toggle in the header.
- `src/pages/LoginPage.tsx` — theme toggle placement, minor padding tweaks.
- `src/components/ChannelBar.tsx` — close the drawer when a channel is selected (or accept a close callback).
- `src/main.tsx` — apply persisted theme before rendering.
- New: `src/store/theme.ts` (zustand store, localStorage persistence), `src/components/ThemeToggle.tsx` (reusable toggle control).
- No new dependencies.