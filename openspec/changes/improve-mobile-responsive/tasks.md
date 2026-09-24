# Tasks

## 1. Foundation

- [ ] 1.1 Add `viewport-fit=cover` to the viewport meta in `index.html`. Verify: on a notched device the layout honours `env(safe-area-inset-*)` (non-zero in devtools device toolbar / an insets emulator).
- [ ] 1.2 Introduce the breakpoint and safe-area custom properties in `index.css` (`--bp-sm: 360px`, `--bp-md: 480px`, `--bp-lg: 700px`; `--safe-top/bottom/left/right` from `env(...)`). Verify: variables resolve to 0 on inset-less desktops and to the device insets on phones.

## 2. Fluid layout and breakpoints

- [ ] 2.1 Convert fixed paddings of `.chat-header`, `.message-list`, `.message-form`, `#root`-adjacent containers and `.modal-overlay` to `clamp()` values that scale across 320-700px. Verify: resizing between 320px and 700px produces no horizontal scrollbar and no jump at 700px.
- [ ] 2.2 Add the `max-width: 480px` and `max-width: 360px` override tiers for the chrome sizes that need per-width tuning. Verify: 320, 360, 390, 480 and 700px each render without overflow.

## 3. Overflow fixes for pickers, modals and messages

- [ ] 3.1 Emoji picker: size with `min(336px, calc(100vw - 24px))` x `min(400px, 60dvh)` and anchor inset-inline on small screens. Verify: on a 320px viewport the panel fits fully and is scrollable, not clipped, in both portrait and landscape.
- [ ] 3.2 Modals: cap `.modal`/`.modal-wide` at `min(360px/520px, 100%)`; confirm GIF picker grid and channel input modal fit at 320px. Verify: no clipped modal on the 320px test width and no horizontal scroll on the login/channel modals.
- [ ] 3.3 Call card: `min-width: min(280px, 100%)` and widen message bubbles to 85% below 480px. Verify: incoming-call card and long message threads render cleanly at 320px.

## 4. Touch targets

- [ ] 4.1 Under `max-width: 480px`, enforce >= 40px tap targets for composer `.icon-btn`/`.send-btn`, drawer channel items, emoji cells, reaction popovers, and call `.call-action` controls. Verify: with the 480px breakpoint active each control reports a hit area of at least 40x40px (devtools box model), and desktop (>700px) button sizing is unchanged.

## 5. Safe-area padding

- [ ] 5.1 Apply `--safe-*` insets to `.chat-header`, `.message-form`, `.channel-bar` drawer, `.call-overlay`, and the login page theme toggle. Verify: on an insets-emulating phone the header/composer/call content clears notch and gesture bar; on inset-less devices nothing shifts.

## 6. Active-call overlay on phones

- [ ] 6.1 Size `.call-self-pip` with `clamp()` and reposition it clear of the duration label; spread `.call-controls` full-width with larger targets under 480px. Verify: on a 390x844 portrait and a 844x390 landscape phone the remote video, self-view, duration and all controls are fully visible without scrolling.
- [ ] 6.2 Run `pnpm lint` and `pnpm build` and fix any issues. Verify: both pass.
- [ ] 6.3 Full manual matrix: viewports 320/360/390/480/700px in portrait and landscape - assert no horizontal scrolling, all opened panels (emoji, GIF, modals, call overlays) fit, and safe-area content is clear. Verify: every `responsive-layout` delta-spec scenario holds on Chrome and Safari (iOS) device toolbars.