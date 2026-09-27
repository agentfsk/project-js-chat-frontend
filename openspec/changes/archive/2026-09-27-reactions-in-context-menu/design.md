# Design

## Context

Today a message offers two unrelated affordances. Right-click and long-press open `MessageContextMenu.tsx`, a `position: fixed` panel listing reply/edit/delete/pin, sized by its own content (`min-width: 180px`, `.message-context-menu` in `src/index.css:975-987`) and placed by inline `left`/`top` computed from the pointer (`MessageContextMenu.tsx:45`). Reacting is a separate control: a `+` pill in the footer of every message (`MessageList.tsx:339-347`) opening `.reaction-popover`, a `flex-wrap` grid of the 8 entries in `REACTION_EMOJIS` capped at `220px`, with no scrolling.

Three properties of the existing panel constrain the approach and are easy to miss:

- It closes on any scroll. `MessageContextMenu.tsx:29-33` registers `onClose` for `scroll` on `window` with `capture: true`. A `scroll` event does not bubble, but a capturing listener on an ancestor does receive it, so this currently fires for the message list and nothing else — because nothing inside the menu scrolls. A horizontally scrolling reaction bubble would be the first thing that does.
- Its `left` clamp uses a hardcoded `220px` (`MessageContextMenu.tsx:45`) that has never matched the panel's real width.
- Below `700px` its entire positioning block (`left`/`right`/`top`/`bottom`/`width`, with `!important`) is attached to `.message-context-menu` itself (`src/index.css:1587-1594`), because that element *is* the positioned box. Any wrapper introduced above it has to take that block with it.

The spec delta (`specs/message-management/spec.md`) requires the reaction bubble to match the actions bubble in width, sit above it with a gap, scroll horizontally, and show a deliberately cut-off reaction whose opacity falls to 50% at the right edge. See proposal.md for the motivation and the decision to remove the footer `+`.

## Goals / Non-Goals

**Goals:**
- One gesture — right-click or long-press — carries every action available on a message, and the per-row `+` disappears.
- The two bubbles stay locked to one width at every viewport, in both the pointer-anchored desktop placement and the mobile bottom sheet.
- Scrolling the reaction bubble never dismisses the menu, on touch or with a wheel.
- The cut-off, faded right edge is guaranteed by geometry, not left to whichever emoji happens to land last.

**Non-Goals:**
- No backend, protocol, schema or storage change; `toggleReaction` already broadcasts the full updated message and the frontend already calls it.
- No change to reaction-chip rendering, to `groupReactions`, or to the "selecting the same emoji again removes it" behaviour — those stay in `chat`'s territory and keep working through the chips.
- No search, no categories, no "more" affordance inside the reaction bubble. The set stays a fixed curated list; the full emoji picker remains in the composer.
- No new component file. The bubble is a second child of the existing menu component, not a separate exported component, because after the `+` is removed there is exactly one call site.

## Decisions

### D1: A wrapper owns the position and the width; the bubbles are plain children

`MessageContextMenu` renders a `.message-context-menu-wrap` that is the single `position: fixed` box, carrying the pointer-derived `left`/`top` on desktop and the `left`/`right`/`bottom` sheet anchoring below `700px`. Inside it, the reaction bubble and the actions bubble are ordinary children stacked with a gap.

Alternative: two independent `position: fixed` elements computed from the same `x`/`y`. Rejected — it needs two vertical calculations that must agree, and on mobile two elements each trying to own `bottom`. The wrapper keeps one positioning box and makes "same width" structural rather than something the two bubbles have to agree about.

Consequence: the mobile positioning block in `src/index.css:1587-1594` moves from `.message-context-menu` to the wrapper, its `!important`s and all, and the actions bubble becomes `position: static` below `700px`.

### D2: The width is set explicitly, because a scroller does not shrink its parent

The load-bearing detail. A child with `overflow-x: auto` contributes its **full content width** to its parent's `max-content` size — the scroller only limits where it paints, not how wide the parent grows. So the obvious sizing, `width: max-content` on the wrapper, would size the menu to the whole set (~20 × 38px ≈ 760px) rather than to the panel.

Rejected alternatives: `width: max-content` (the bug above); `display: grid` with `grid-template-columns: min-content` (identical max-content contribution, so identical result); absolutely positioning the reaction bubble inside a content-sized wrapper (works, but drops the bubble out of flow, so the gap and the height the vertical clamp must reserve for both no longer come from the layout).

Chosen: an explicit width on the wrapper, `--menu-w: 180px`, carrying today's `min-width`. The longest label is «Открепить» at roughly 88px including its padding, so nothing clips at 180px; the number is a token, not a magic value. The reaction bubble gets `min-width: 0` so it is allowed to shrink, and the actions bubble gets `width: 100%`. The `left` clamp's hardcoded `220px` is replaced with the same token, which incidentally fixes a clamp that never matched the real width.

### D3: Ignore scroll events that originate inside the menu

`handleScroll` in `MessageContextMenu.tsx:29-33` gains a containment check: if the event target is inside the menu, return. That is the whole fix, and it is scoped to the capture-phase listener only.

Alternative: narrow the listener to the message list's own scroll. Rejected — the menu holds no reference to the list, and the existing "close on any scroll" behaviour is deliberate (it is what dismisses the menu when the conversation moves under it). Keeping the broad listener and excluding the menu's own internals preserves the intent and adds one condition.

The click path needs nothing: `onPointerDown` on the panel already calls `stopPropagation` (`MessageContextMenu.tsx:48`), so a pointerdown inside the bubble never reaches the `window` `pointerdown` listener that closes on outside clicks, and the subsequent `click` still fires.

### D4: A static mask on the scroll container, not on a child

The fade is one declaration on the scrolling element:

```
mask-image: linear-gradient(to right, #000 0%, #000 82%, rgba(0,0,0,0.5) 100%);
-webkit-mask-image: /* same */;
```

`-webkit-mask-image` is not optional here: `responsive-layout` has scenarios naming iOS Safari, which needs the prefix. The mask has to be on the scroll container itself — on a child it would scroll away with the content instead of staying pinned to the right edge. The mask applies to the padding box and does not move with `scrollLeft`, which is exactly the behaviour a static hint needs.

Alternative: drop the mask whenever `scrollLeft` reaches the end, via a scroll listener and a piece of local state. Rejected — it is the more truthful behaviour, but it is ~15 lines of listener plus state to maintain a hint, and the delta spec asks for the fade to be present while the menu is open. Accepted cost: after the reader scrolls to the very end, the fade is still there, advertising nothing. If that reads badly it is a follow-up, not a blocker.

Note the mask is a *fade*, not a clip: the cut-off reaction stays fully hit-testable, which the delta spec requires and which `pointer-events` must therefore not be used to break.

### D5: The cut-off is guaranteed by picking the set size, and the set stays a literal

At the desktop width the reaction bubble's content box is `180 - 2×6 = 168px`. With `34px` items and a `4px` gap the offsets are 0/38/76/114/152, so four reactions sit fully inside and the fifth starts at `152px` and is cut at `168px` — 16px of a 34px glyph visible, at roughly 77% opacity falling to 50% at the edge. Below `700px` the sheet is `296px` wide, `284px` inner, so seven fit and the eighth is cut. The cut-off therefore holds at every menu width the app produces.

That is only true because the set is much larger than the bubble. `REACTION_EMOJIS` grows from 8 to roughly 20, which also gives several screens of scroll on desktop rather than a token gesture.

The set is drawn from `src/data/emojiIndex.json` — already bundled, no new dependency — mostly from category 0 «Смайлы и эмоции» (171 entries) with a few from neighbouring categories, but it is written out as a **literal array** in `src/data/emoji.ts`, not derived at runtime. That is what keeps `chat`'s "fixed standard set" wording true: the set is a constant, not a view over the emoji database. The count is a one-line change if 20 proves too many to scan.

### D6: Extend the vertical clamp rather than flip the bubble

Today's `top` is `min(y, 100vh - actions.length * 44px)`, which reserves room for the actions bubble alone. The reaction bubble adds a constant height plus the gap, so the reservation grows by that constant:

```
top: max(8px, min(y, calc(100vh - actions.length * 44px - 52px)))
```

When the clamp bites, the whole pair shifts down together, so the reaction bubble stays above the actions bubble and stays on screen.

Alternative: measure the pair after mount and move the reaction bubble *below* the actions bubble when there is no room above — the technique `.flip-up` already used for the old popover. Rejected. The delta spec states the reaction bubble is above the actions bubble, and a flip would make that conditional on viewport position. Clamping is also already this panel's established behaviour — the menu visibly detaches from the cursor when it clamps today — so the pair shifting as a unit is the smaller surprise, and it needs no measurement pass, no ref and no re-render.

On mobile the sheet is bottom-anchored and this clamp does not apply. The worst case is landscape: a 4-item sheet at `12px` padding is about `172px`, plus `52px` for the reaction bubble and gap and `12px` of bottom inset, so roughly `236px` of the `320px` viewport height — the top edge is not at risk.

### D7: Claim horizontal pans explicitly

`touch-action: pan-x` on the reaction bubble, and `overscroll-behavior-x: contain` so a fling stops at the ends instead of chaining into the page. Without the first, a diagonal drag on a phone can be claimed by the vertical `.message-list` scroller that the bubble sits inside.

No work is needed to keep the long-press gesture away from the bubble. The touch handlers are on the message row (`.message`, `MessageList.tsx:294-303`) while the wrapper is a *sibling* of the rows inside `.message-list` — a touch that lands on the bubble never reaches them, so it cannot start, extend or cancel a long press.

### D8: Delete the popover rules rather than orphan them

`.reaction-add` (`src/index.css:853-872`), `.reaction-popover` and its `.flip-up` variant (`874-893`), `.reaction-popover-item` and its `.active` variant (`895-915`), and the mobile `.reaction-add` / `.reaction-popover-item` touch-target overrides (`1656-1664`) all become unreferenced. They go.

That also retires a coupling: the `improve-mobile-responsive` design named `.reaction-popover-item` as one of the selectors enforcing the `40px` phone touch target (its D5). With the popover gone, the reaction bubble's item becomes the selector carrying that obligation, so the `40px` override moves to it and the touch-target requirement in `responsive-layout` stays satisfied for reactions.

In `MessageList.tsx` this removes the `reactionFor` state (`:150`), the two popover effects (`:165-198`), the `+` button (`:339-347`) and the popover markup (`:348-368`). The `REACTION_EMOJIS` import moves to `MessageContextMenu`. `groupReactions` and the reaction chips (`:326-338`) are untouched: a chip is how the reader removes a reaction they already applied, and it keeps calling `onMessageReaction`, so `chat`'s "selecting the same emoji again removes it" stays reachable.

## Risks / Trade-offs

- [The first horizontal swipe of the reaction bubble closes the menu, because the capture-phase scroll listener is pre-existing and nobody expects it to fire] → D3's containment check is the very first task and is verified first, in isolation, before any styling work.
- [The wrapper renders at the full set width if the explicit width is missed] → the width is a single token on one selector, and "the two bubbles are the same width and neither is wider than the panel" is a scenario in the delta spec rather than an eyeball check.
- [Below `700px` only the actions bubble is repositioned, leaving the two bubbles independently placed] → D1's consequence is called out explicitly; the mobile positioning block moves to the wrapper as one unit.
- [A static fade remains visible after the reader scrolls to the end] → accepted, per D4. The alternative is a deferrable follow-up and does not block this change.
- [Dropping the footer `+` makes long-press the only way to pick a new reaction, which is less discoverable on a phone] → deliberate, and stated in the proposal. The gesture it depends on is already implemented and already specced, and reverting is a matter of restoring one button if it turns out to hurt.
- [The reaction set is a hand-curated literal that can drift from the emoji data it was drawn from] → it is a constant either way, so drift is cosmetic; the `improve-mobile-responsive` precedent of pinning a curated constant (`REACTION_EMOJIS` today) is the same trade.

## Migration Plan

Frontend-only. No backend, protocol, or data change, so there is nothing to migrate and nothing to roll back beyond reverting the four files. Reactions already stored keep rendering as chips throughout. No feature flag: the change is a swap of one entry point for another, and both are reachable from the same list in the same commit.

## Open Questions

None. The exact emoji composition of the ~20 entries, and the precise 34px/6px/52px numbers, are values to be adjusted against the 320/390/700/1440 matrix during apply; none of them changes the approach, the spec, or the task breakdown.
