# Tasks

## 1. Foundation

- [x] 1.1 Add `viewport-fit=cover` to the viewport meta in `index.html`. Verify: on a notched device the layout honours `env(safe-area-inset-*)` (non-zero in devtools device toolbar / an insets emulator).
- [x] 1.2 Introduce the breakpoint and safe-area custom properties in `index.css` (`--bp-sm: 360px`, `--bp-md: 480px`, `--bp-lg: 700px`; `--safe-top/bottom/left/right` from `env(...)`). Verify: variables resolve to 0 on inset-less desktops and to the device insets on phones.

## 2. Fluid layout and breakpoints

- [x] 2.1 Convert fixed paddings of `.chat-header`, `.message-list`, `.message-form`, `#root`-adjacent containers and `.modal-overlay` to `clamp()` values that scale across 320-700px. Verify: resizing between 320px and 700px produces no horizontal scrollbar and no jump at 700px.
- [x] 2.2 Add the `max-width: 480px` and `max-width: 360px` override tiers for the chrome sizes that need per-width tuning. Verify: 320, 360, 390, 480 and 700px each render without overflow.

## 3. Content escaping its container

- [x] 3.1 Make the message row shrink-safe: `min-width: 0` on `.message-head` and `.message-reactions`, ellipsis on `.message-user`, `max-width: 100%` on `.message-content`. Verify: a message with a long sender name and an attachment stays within the row at 320px and the name truncates.
- [x] 3.2 Cap the image preview at `min(260px, 100%)` with `height: auto` and `object-fit: contain`. Verify: a 600px-wide GIF in a 320px message renders inside the bubble with its aspect ratio intact and does not overlap the next message.

## 4. Overflow fixes for pickers, modals and messages

- [x] 4.1 Emoji picker: size with `width: min(336px, calc(100vw - 2 * var(--safe-left) - 24px))` x `height: min(400px, 60dvh)`, keeping the existing `left: 12px` anchor. The viewport term already reserves the 12px gutter on both sides, so no `inset-inline` is needed - see D3. Verify: on a 320px viewport the panel fits fully and is scrollable, not clipped, in both portrait and landscape.
- [x] 4.2 Modals: cap `.modal`/`.modal-wide` at `min(360px/520px, 100%)`; bound `.modal` height to the viewport and make `.gif-picker-grid` a shrinkable flex child (`flex: 1; min-height: 0`); add `overflow-y: auto` to `.modal-overlay`. Verify: the GIF picker in a 667x375 landscape phone scrolls instead of being cut off, with the close control and credit still visible; no clipped modal at 320px width.
- [x] 4.3 Call card: `min-width: min(280px, 100%)` and widen message bubbles to 85% below 480px. Verify: incoming-call card and long message threads render cleanly at 320px.
- [x] 4.4 Clamp transient overlays: `max-width` plus wrapping on `.call-toast`, and `max-width: min(220px, calc(100vw - ...))` plus `max-width: 100%` on `.message-reactions` so the popover shrinks instead of crossing the edge. Verify: a long call error and a reaction popover on a right-edge message stay fully visible at 320px.

## 5. Touch targets

- [x] 5.1 Under `max-width: 480px`, enforce >= 40px tap targets for composer `.icon-btn`/`.send-btn`, drawer channel items, emoji cells, reaction popovers, and call `.call-action` controls. Verify: with the 480px breakpoint active each control reports a hit area of at least 40x40px (devtools box model), and desktop (>700px) button sizing is unchanged.

## 6. Safe-area padding

- [x] 6.1 Apply `--safe-*` insets to `.chat-header`, `.message-list`, `.message-form`, `.channel-bar` drawer, `.call-overlay`, and the login page theme toggle. Verify: on an insets-emulating phone the header/composer/call content clears notch and gesture bar; **in landscape no message bubble or avatar sits under the side notch**; on inset-less devices nothing shifts.

## 7. Active-call overlay on phones

- [x] 7.1 Size `.call-self-pip` with `clamp()` and reposition it clear of the duration label; spread `.call-controls` full-width with larger targets under 480px. Verify: on a 390x844 portrait and a 844x390 landscape phone the remote video, self-view, duration and all controls are fully visible without scrolling.
- [x] 7.2 Run `pnpm lint` and `pnpm build` and fix any issues. Verify: both pass.
- [ ] 7.3 Full manual matrix: viewports 320/360/390/480/700px in portrait and landscape - assert no horizontal scrolling, all opened panels (emoji, GIF, modals, call overlays) fit, image attachments stay inside their message, and safe-area content is clear. Verify: every `responsive-layout` and `chat` delta-spec scenario holds on Chrome and Safari (iOS) device toolbars.
