# Design

## Context

`src/index.css` implements a single mobile/desktop split at `max-width: 700px`. Below the breakpoint everything falls back to fixed pixel sizes: emoji picker is a rigid `336px` wide and `400px` tall panel anchored `left: 12px` (overflows 320px-wide screens), modals are `max-width: 360px/520px` inside a `24px`-padded overlay (overflows small viewports and can clip), the composer row, drawer items and call controls use ~32-40px touch targets, and there are no safe-area insets or landscape adjustments. `index.html`'s viewport meta lacks `viewport-fit=cover`, so `env(safe-area-inset-*)` reports zero even on notched devices.

The spec-driven plan (see proposal.md - Why and the `responsive-layout` delta) requires fitting all phone resolutions without horizontal scrolling, fluid chrome, safe-area awareness, larger touch targets, and a phone-usable active-call view.

## Goals / Non-Goals

**Goals:**
- Continuous, fluid scaling across widths 320-700px (no horizontal scrolling, nothing clipped).
- Every overlay/picker/modal fits the viewport it opens on.
- Tap targets >= 40px for interactive controls on phones.
- Content clear of device insets (notch, gesture bar) in portrait and landscape.
- Active-call overlay usable on phones, portrait and landscape.

**Non-Goals:**
- No changes to the desktop (>700px) layout.
- No component rewrites, no new components, no JS logic changes except where a class/structure tweak is unavoidable.
- No global design-token overhaul beyond the spacing/fluid helpers needed here.
- No change to the 700px mobile/desktop boundary defined by the existing spec.

## Decisions

### D1: Fluid spacing with clamp(), scoped to phone widths

Use `clamp(min, preferred, max)` for paddings and sizes that previously used fixed `px`, with `vw`-based preferred values so they scale continuously. Examples: header padding `clamp(10px, 4vw, 12px)`, message-list/form paddings `clamp(10px, 5vw, 20px)`, overlay padding `clamp(12px, 4vw, 24px)`. The desktop values (>=700px) stay exactly as they are today; the media-query overrides only ever tighten or relax within the phone range. Alternative considered: a global `rem` scale knob (`:root { font-size ... }`) - rejected because it would rescale everything including desktop, and inputs/resize behavior are easier to reason about with explicit `clamp()`. Use `dvh` (with `vh` fallback line) for any full-height sizing so mobile browser chrome is respected.

### D2: Breakpoint set centered on real phone widths

Keep the existing `@media (max-width: 700px)` as the mobile start, and layer narrower overrides:
- `(max-width: 480px)` — standard phones: touch-target sizing, message bubble widening, emoji-picker positioning.
- `(max-width: 360px)` — small phones (SE-class): minimal padding, call card/pip squeezes.
- Landscape: decided as **`(max-height: 480px)` combined with `(orientation: landscape)`**, not either/or. Height alone is the real constraint in landscape (the emoji picker plus header plus composer is what overflows), while `orientation: landscape` alone would also fire on a wide desktop window where nothing needs compacting. Both queries are scoped so a desktop window that merely happens to be short is unaffected by the picker height cap.

CSS custom properties can hold the point values in one place (`--bp-sm: 360px`, `--bp-md: 480px`, `--bp-lg: 700px`, `--safe-top/bottom/left/right`).

### D3: Fitting overlays, pickers and modals

- Emoji picker: `width: min(336px, calc(100vw - 2 * var(--safe-left) - 24px))`; `height: min(400px, 60dvh)` (with a `400px` fallback line for older engines). The panel keeps its existing `left: 12px` anchor rather than switching to `inset-inline: 12px` on small screens: the `calc(100vw - 24px)` term already reserves the 12px gutter on both sides, so `left` alone is sufficient. Adding `inset-inline` alongside an explicit `width` would leave the box over-constrained - the `right` offset is silently discarded in LTR, so the rule would appear to work while doing nothing, and would collapse to full form width if the `width` were ever removed.
- Modals: `.modal { max-width: min(360px, 100%) }`, `.modal-wide { max-width: min(520px, 100%) }` so the overlay's padding (also `clamp`ed) is what defines the margin, never leaving a clipped panel.
- Call card: `min-width: min(280px, 100%)`.
- Message bubbles: `max-width: 70%` on desktop, `85%` below 480px.

### D4: Safe-area support

Add `viewport-fit=cover` to the viewport meta in `index.html`, then define `--safe-top/--safe-bottom` etc. via `env(safe-area-inset-*)` (defaulting to 0) and apply as padding on `.chat-header`, `.message-form`, `.message-list`, `.channel-bar` (drawer), `.call-overlay`, and the login page's floating theme toggle. On devices without insets `env()` evaluates to 0px, so this is a no-op there.

`.message-list` is included deliberately, not incidentally. In portrait the insets are vertical and the list is bounded by the header and composer, so it looked fine without them. In **landscape** the insets move to the left and right edges - the list is the only full-bleed element in the layout, and it is exactly the element that would sit under the side notch. Applying the same `--safe-*` variables in all four directions covers both orientations with one rule; the cost on desktop is zero because the variables resolve to `0px`.

### D5: Touch targets

Below 480px enforce minimum interactive sizes: composer `.icon-btn`/`.send-btn` and call `.call-action` controls get `min-width`/`min-height: 40-44px`. Achieved with the existing selectors (`.message-form-row .icon-btn`, `.send-btn`, `.call-action`, `.emoji-cell`, `.reaction-popover-item`) so no component changes are needed.

### D6: Active-call overlay on phones

- `.call-self-pip`: `width: clamp(120px, 34vw, 180px); height: clamp(80px, 23vw, 120px)`, repositions to keep clear of the duration label.
- `.call-controls`: on `<=480px` spread full width (`width: 100%; justify-content: space-around`) with the larger tap targets; keep it a horizontal row in landscape by reducing vertical padding.
- `.active-call` padding already derives from overlay padding (D1) and `100svh` root height, so portrait and landscape both fit without scroll.

### D7: Make the message row shrink-safe before capping the image

The root cause of images leaving their bubble is not the image cap itself but the row it sits in. `.message` is a row flex container with three items - `.message-head`, `.message-content`, `.message-reactions` - and only `.message-content` had `min-width: 0`. A long sender name and the reaction row therefore could not shrink below their min-content width, so they pushed `.message-content` past the row's `70%` cap. At 320px the row's content box is ~172px while the fixed siblings consume ~154px, leaving roughly 18px for content against a 260px image.

Fix the chain, not just the leaf:

- `.message-head` and `.message-reactions` get `min-width: 0` so they may shrink.
- `.message-user` gets `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` so a long name truncates instead of pushing.
- `.message-content` keeps its `min-width: 0` and also gets `max-width: 100%`.
- The image cap becomes `max-width: min(260px, 100%)` and gains `height: auto; object-fit: contain` so it scales down instead of distorting.

Alternative considered: dropping the `70%` cap on narrow screens only. Rejected - the cap is what keeps long text lines readable, and the cap is not the defect; the missing shrink permission on the siblings is.

### D8: Bound modal height with a shrinkable flex child

`.modal-overlay` is a centred flex container with no `overflow-y`, and `.modal` had no `max-height`, while `.gif-picker-grid` was a fixed `320px`. On a short viewport (landscape phone) the modal's natural height exceeded the overlay, so it was clipped top and bottom and the grid never scrolled - its scrollbar only appears if the grid is first shrunk below its content size.

- `.modal-overlay` gets `overflow-y: auto` so a modal that still exceeds the viewport stays reachable instead of being cut off.
- `.modal` gets `max-height: calc(100dvh - 2 * overlay padding)` with a `vh` fallback line, so it never outgrows the viewport.
- `.gif-picker-grid` becomes `flex: 1; min-height: 0` and its fixed `max-height: 320px` is relaxed to `min(320px, 45dvh)`. The `min-height: 0` is the load-bearing part: flex items default to `min-height: auto`, which refuses to shrink below content and is the classic cause of a scroll container that never scrolls.

### D9: Clamp transient overlays to the viewport

Two overlays are positioned without any viewport bound and can cross a screen edge:

- `.call-toast` is `position: fixed; left: 50%; transform: translateX(-50%)` with no `max-width`, so a long message extends past both edges. Give it `max-width: min(420px, calc(100% - 2 * safe inset))` and let the text wrap.
- `.reaction-popover` is anchored `right: 0` to `.message-reactions` and capped at `220px`, but `MessageList.tsx` only toggles `flip-up`, a vertical correction. A reaction control near the right edge pushes the popover off-screen. Fix in CSS with `max-width: min(220px, calc(100vw - 2 * safe inset))` plus a `max-width: 100%` on `.message-reactions`, so the popover shrinks to the message instead of crossing the viewport edge. No JS change: the existing vertical `flip-up` logic stays as is.

## Risks / Trade-offs

- [Stray appearance regressions at the 700px boundary] -> `clamp()` functions are continuous and the breakpoint value is untouched; desktop styles are never edited, so the boundary looks identical.
- [`dvh`/`clamp()` support on older WebViews] -> modern evergreen browsers are the target; keep a `vh` fallback line before any `dvh` use and avoid relying on `env()` in older engines (it defaults to 0).
- [Enforcing sizes may crowd denser layouts on tiny screens] -> the `<=360px` tier trims only the layout edges (padding, pip size), never content, and the spec calls for no clipped content.
- [CSS-only tweaks for the pip/controls still missing a wrapper hook] -> if the call overlay needs structural changes, they are limited to adding a class to existing elements; the components read cleanly and are not scheduled for rewrite.

## Migration Plan

Frontend-only and purely additive/overriding CSS plus a one-line `viewport-fit=cover` meta change in `index.html`. Revert = drop the override layers; no data or server impact. No feature flag needed.

## Open Questions

None. The `landscape vs portrait` handling is covered by the `max-height`/`orientation` media rules and the spec scenarios; any remaining fine-tuning happens during apply as exact pixel values are validated against the 320/360/390/480/700 test matrix.