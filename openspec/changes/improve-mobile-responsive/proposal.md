# Proposal

## Why

The mobile layout has a single `max-width: 700px` breakpoint and a fixed set of pixel sizes, so the app does not fit each phone's resolution: the emoji picker is a fixed 336px and overflows 320px-wide screens, modals overflow small viewports, composer/call controls have small touch targets, and there are no safe-area insets for notched devices or landscape short screens.

## What Changes

- Add fluid sizing: scale paddings, widths and heights with `clamp()` so the layout adapts continuously across resolutions instead of jumping between one mobile and one desktop state.
- Add finer breakpoints (~360px, 480px, 700px) for targeted adjustments on small phones, standard phones, and tablets.
- Fix concrete overflow cases: emoji picker width/height fit the viewport (`min(336px, calc(100vw - 24px))`, `min(400px, 60dvh)`), modals cap at `min(360px, 100%)`, call cards fit small widths, message bubbles widen on narrow screens.
- Enlarge touch targets (>= 40-44px) for composer and call controls on narrow screens.
- Respect notched/gesture-bar devices via `viewport-fit=cover` + `env(safe-area-inset-*)` paddings on the header, message form, drawers and call overlay.
- Adapt the active-call overlay and controls to portrait phone viewports.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `responsive-layout`: The mobile-layout and login-page requirements gain scenarios for fitting the full range of phone resolutions without horizontal scrolling, fluidly scaled chrome, and safe-area awareness; the mobile breakpoint behavior is extended beyond the single 700px cut-off.

## Impact

- `src/index.css` — the bulk of the work: new breakpoint ranges, `clamp()`-based spacing, overflow fixes, touch targets, safe-area padding, call-overlay mobile styling.
- `index.html` — add `viewport-fit=cover` to the viewport meta so safe-area insets report correctly.
- `src/components/ActiveCallOverlay.tsx` / `IncomingCallOverlay.tsx` — only if a small class/structure tweak is needed for the mobile call layout (e.g., wrapping controls or a per-screen pip size); otherwise no component changes.
- No JS logic, API, or server changes.