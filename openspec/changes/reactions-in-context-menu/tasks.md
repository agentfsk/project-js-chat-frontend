# Tasks

## 1. Reaction set

- [x] 1.1 Grow `REACTION_EMOJIS` in `src/data/emoji.ts` from 8 to roughly 20 curated entries, drawn from category 0 «Смайлы и эмоции» of the already-bundled `src/data/emojiIndex.json` with a few from neighbouring categories, and written out as a literal array rather than derived at runtime so `chat`'s "fixed standard set" wording stays true. Verify: the count exceeds the number of 34px items that fit in the bubble's content box at both menu widths (168px desktop, 284px on the mobile sheet), so a reaction is always cut off at rest at either width.

## 2. Context menu structure

- [x] 2.1 Add `reactions`, `activeReactions` and `onReact` props to `src/components/MessageContextMenu.tsx` and render a `.message-context-menu-wrap` that is the single `position: fixed` box carrying the pointer-derived coordinates, with the reaction bubble above and the actions bubble below, separated by a gap. Verify: right-click and long-press both open two stacked panels, and the actions bubble no longer positions itself.
- [x] 2.2 Move the below-700px positioning block (`left`/`right`/`top`/`bottom`/`width` and its `!important`s) from `.message-context-menu` to `.message-context-menu-wrap`, and make the actions bubble `position: static` at that width. Verify: on a 390px viewport the pair is bottom-anchored above the safe inset and both bubbles span the same width.
- [x] 2.3 Render each reaction as a button that marks it applied when the reader already holds it, calls `onReact(emoji)` and then dismisses the menu. Verify: opening the menu on a message the reader has already reacted to shows that reaction as applied; picking an unapplied one adds it and closes the menu; picking an applied one removes it.
- [x] 2.4 Replace the hardcoded `220px` in the `left` clamp with the menu width token, and extend the `top` clamp so it reserves the reaction bubble and the gap in addition to the actions bubble. Verify: a message at the top of the viewport opens with both bubbles fully on screen and the reaction bubble still above the actions bubble.

## 3. Dismissal guard

- [x] 3.1 Make the capture-phase `scroll` handler in `src/components/MessageContextMenu.tsx` ignore events whose target is inside the menu. Verify: dispatching a `scroll` event on the reaction bubble leaves the menu open, while dispatching one on `.message-list` still closes it.
- [x] 3.2 Confirm `onPointerDown`'s existing `stopPropagation` is what keeps a press on a reaction from being read as an outside click, and leave it in place. Verify: a pointerdown on a reaction does not dismiss the menu before the `click` fires.

## 4. Styling

- [x] 4.1 Set the wrapper's width explicitly from a token, give the reaction bubble `min-width: 0` and the actions bubble `width: 100%`. Verify: neither bubble is wider than the panel, and the wrapper does not grow to the width of the full set.
- [x] 4.2 Make the reaction bubble a horizontal scroller: single-line flex, `overflow-x: auto`, the item gap, plus `touch-action: pan-x` and `overscroll-behavior-x: contain`. Verify: reactions past the bubble's edge are reachable by drag on touch and by scrolling, and a diagonal drag on a phone scrolls the reaction bubble rather than the conversation.
- [x] 4.3 Apply the fade to the scroll container itself, with both the standard and `-webkit-` prefixed `mask-image`, opaque at the left falling to 50% at the right edge. Verify: the bubble is fully opaque at its left, the cut-off reaction reads at 50% at the right edge, and that reaction is still clickable.
- [x] 4.4 Size reaction items at 34px and carry the 40px phone touch-target override that the popover used to hold, so the item becomes the selector satisfying `responsive-layout`'s tap-target scenario. Verify: composer, drawer and call targets keep their 40px minimum on a 390px viewport, and reaction items do too.
- [x] 4.5 Give the reaction bubble the same background, border, radius and shadow as the actions bubble. Verify: the two read as one menu at 1440px and at 390px, in both the dark and the light theme.

## 5. Remove the footer reaction control

- [x] 5.1 Delete the `+` button and the `.reaction-popover` markup from `src/components/MessageList.tsx`, along with the `reactionFor` state, the flip-up effect and the outside-click/keydown effect that served only the popover, and move the `REACTION_EMOJIS` import to `MessageContextMenu`. Verify: no message renders its own reaction control, and the context menu is the only way to pick a new reaction.
- [x] 5.2 Pass the message's current reactions and `onMessageReaction` into `MessageContextMenu` from the place that renders it. Verify: right-click and long-press both open a reaction bubble that is populated and marked correctly for the message under the pointer.
- [x] 5.3 Leave `groupReactions` and the reaction chips untouched, and confirm a chip still toggles. Verify: clicking a chip carrying the reader's own reaction removes it, and clicking a chip for someone else's reaction leaves the reader's own reaction untouched.
- [x] 5.4 Delete the now-unreferenced `.reaction-add`, `.reaction-popover`, `.reaction-popover.flip-up`, `.reaction-popover-item` and `.reaction-popover-item.active` rules and their below-700px touch-target overrides. Verify: `grep -rn "reaction-popover\|reaction-add\|flip-up" src/` returns nothing.

## 6. Verification

- [x] 6.1 Run `pnpm lint` and `pnpm build`. Verify: both pass.
- [ ] 6.2 Manual matrix at 320/390/700/1440px in portrait and landscape, covering right-click and long-press, the reaction bubble's width against the actions bubble, the gap between them, the cut-off reaction and its fade, horizontal scrolling of the bubble, the vertical clamp on a message at the top of the viewport, and neither bubble clipped. Verify: every scenario in the `message-management` delta holds, and `responsive-layout`'s "Transient overlays stay inside the viewport" still holds for the reaction picker.
- [ ] 6.3 Two-session regression check with the backend on port 5001: a reaction picked from the menu appears on the other participant's message without a refresh, stays confined to the two participants in a direct chat, and a reader's own reaction is never counted as unread. Verify: `chat`'s reaction requirements and `unread-indicators` are unaffected by this change.
