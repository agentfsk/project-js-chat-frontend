# Proposal

## Why

The mobile layout has a single `max-width: 700px` breakpoint and a fixed set of pixel sizes, so the app does not fit each phone's resolution: the emoji picker is a fixed 336px and overflows 320px-wide screens, modals overflow small viewports, composer/call controls have small touch targets, and there are no safe-area insets for notched devices or landscape short screens.

Investigation during apply found a second, more visible family of defects that the original framing missed: **content escaping its container rather than merely being too large.** The message row is a flex container whose non-content children cannot shrink, so a long sender name plus a 260px image overflow the message and overlap neighbours; the GIF picker modal has no height bound, so on a landscape phone it is clipped instead of scrolling; the call toast and the reaction popover have no viewport clamp and cross the screen edge. These are reported as overlapping UI on real phones, so they are fixed here rather than deferred.

## What Changes

- Add fluid sizing: scale paddings, widths and heights with `clamp()` so the layout adapts continuously across resolutions instead of jumping between one mobile and one desktop state.
- Add finer breakpoints (~360px, 480px, 700px) for targeted adjustments on small phones, standard phones, and tablets.
- Make the message row shrink-safe: allow the header and reaction siblings to shrink, ellipsis long sender names, and cap image previews at `min(260px, 100%)` with `object-fit: contain` so attachments never escape their message.
- Fix concrete overflow cases: emoji picker width/height fit the viewport (`min(336px, calc(100vw - 24px))`, `min(400px, 60dvh)`), modals cap at `min(360px, 100%)` and gain a viewport height bound with a shrinkable scroll region, call cards fit small widths, message bubbles widen on narrow screens.
- Clamp transient overlays to the viewport: the call toast gets a `max-width` and wraps, the reaction popover shrinks to its message instead of crossing the edge.
- Enlarge touch targets (>= 40-44px) for composer and call controls on narrow screens.
- Respect notched/gesture-bar devices via `viewport-fit=cover` + `env(safe-area-inset-*)` paddings on the header, message list, message form, drawers and call overlay.
- Adapt the active-call overlay and controls to portrait phone viewports.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `responsive-layout`: The mobile-layout and login-page requirements gain scenarios for fitting the full range of phone resolutions without horizontal scrolling, fluidly scaled chrome, and safe-area awareness; the mobile breakpoint behavior is extended beyond the single 700px cut-off. Scenarios are added for modals with long content on short viewports and for transient overlays staying inside the viewport.
- `chat`: `Render message attachments` gains scenarios requiring an image preview to stay inside its message with a preserved aspect ratio, and requiring a long sender name to truncate rather than displace the preview.

## Impact

- `src/index.css` — the bulk of the work: new breakpoint ranges, `clamp()`-based spacing, shrink permissions on the message row, overflow fixes, touch targets, safe-area padding, call-overlay mobile styling.
- `index.html` — add `viewport-fit=cover` to the viewport meta so safe-area insets report correctly.
- `src/components/ActiveCallOverlay.tsx` / `IncomingCallOverlay.tsx` — only if a small class/structure tweak is needed for the mobile call layout (e.g., wrapping controls or a per-screen pip size); otherwise no component changes.
- `src/components/MessageList.tsx` — no change required; the reaction popover clamp is solved in CSS. Recorded explicitly because the popover's only existing correction is vertical.
- No JS logic, API, or server changes.
