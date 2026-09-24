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
- `(max-height: 480px)` and/or `(orientation: landscape)` — landscape phones: compact header/form, scrollable emoji picker.

CSS custom properties can hold the point values in one place (`--bp-sm: 360px`, `--bp-md: 480px`, `--bp-lg: 700px`, `--safe-top/bottom/left/right`).

### D3: Fitting overlays, pickers and modals

- Emoji picker: `width: min(336px, calc(100vw - 24px))`; `height: min(400px, 60dvh)`; on `<=480px` anchor it `inset-inline: 12px` instead of the current `left: 12px` so it hugs the composer and cannot overhang the right edge.
- Modals: `.modal { max-width: min(360px, 100%) }`, `.modal-wide { max-width: min(520px, 100%) }` so the overlay's padding (also `clamp`ed) is what defines the margin, never leaving a clipped panel.
- Call card: `min-width: min(280px, 100%)`.
- Message bubbles: `max-width: 70%` on desktop, `85%` below 480px.

### D4: Safe-area support

Add `viewport-fit=cover` to the viewport meta in `index.html`, then define `--safe-top/--safe-bottom` etc. via `env(safe-area-inset-*)` (defaulting to 0) and apply as padding on `.chat-header`, `.message-form`, `.channel-bar` (drawer), `.call-overlay`, and the login page's floating theme toggle. On devices without insets `env()` evaluates to 0px, so this is a no-op there.

### D5: Touch targets

Below 480px enforce minimum interactive sizes: composer `.icon-btn`/`.send-btn` and call `.call-action` controls get `min-width`/`min-height: 40-44px`. Achieved with the existing selectors (`.message-form-row .icon-btn`, `.send-btn`, `.call-action`, `.emoji-cell`, `.reaction-popover-item`) so no component changes are needed.

### D6: Active-call overlay on phones

- `.call-self-pip`: `width: clamp(120px, 34vw, 180px); height: clamp(80px, 23vw, 120px)`, repositions to keep clear of the duration label.
- `.call-controls`: on `<=480px` spread full width (`width: 100%; justify-content: space-around`) with the larger tap targets; keep it a horizontal row in landscape by reducing vertical padding.
- `.active-call` padding already derives from overlay padding (D1) and `100svh` root height, so portrait and landscape both fit without scroll.

## Risks / Trade-offs

- [Stray appearance regressions at the 700px boundary] -> `clamp()` functions are continuous and the breakpoint value is untouched; desktop styles are never edited, so the boundary looks identical.
- [`dvh`/`clamp()` support on older WebViews] -> modern evergreen browsers are the target; keep a `vh` fallback line before any `dvh` use and avoid relying on `env()` in older engines (it defaults to 0).
- [Enforcing sizes may crowd denser layouts on tiny screens] -> the `<=360px` tier trims only the layout edges (padding, pip size), never content, and the spec calls for no clipped content.
- [CSS-only tweaks for the pip/controls still missing a wrapper hook] -> if the call overlay needs structural changes, they are limited to adding a class to existing elements; the components read cleanly and are not scheduled for rewrite.

## Migration Plan

Frontend-only and purely additive/overriding CSS plus a one-line `viewport-fit=cover` meta change in `index.html`. Revert = drop the override layers; no data or server impact. No feature flag needed.

## Open Questions

None. The `landscape vs portrait` handling is covered by the `max-height`/`orientation` media rules and the spec scenarios; any remaining fine-tuning happens during apply as exact pixel values are validated against the 320/360/390/480/700 test matrix.