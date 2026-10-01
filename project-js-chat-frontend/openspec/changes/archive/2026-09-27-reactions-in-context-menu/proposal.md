# Proposal

## Why

Reactions and the context menu are two separate affordances that both act on one message, and the reader has to find the right one. Reacting currently means noticing a small `+` pill in the footer of every single message, while right-click and long-press — the gesture the reader already uses for everything else on a message — open only edit/reply/pin/delete. The `+` pill also puts a permanent control on every row, including rows the reader never intends to react to. Putting the standard reaction set into the context menu makes the one gesture that already opens a menu on a message carry the whole set of actions for that message, and lets the per-row control go away.

## What Changes

- The context menu opened on right-click and long-press gains a second bubble above the actions bubble, holding the standard reaction set. The two bubbles share one width — the actions bubble's — and are separated by a gap.
- The reaction bubble scrolls horizontally. At rest, with no scrolling applied, a reaction is deliberately cut off at the right edge so the reader can see there is more, and opacity falls smoothly from fully opaque to 50% from the left of the bubble to its right edge.
- Picking a reaction from that bubble toggles it on the message under the pointer and closes the context menu.
- **BREAKING**: the `+` reaction button in the message footer and the popover it opens are removed. The context menu becomes the only way to pick a reaction that is not already shown as a chip. Existing reaction chips stay and remain a way to remove one's own reaction.
- The standard reaction set grows from 8 to roughly 20 curated emoji, so the strip has content beyond the visible width at every menu width the app produces.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `message-management`: the "Message context menu on desktop and mobile" requirement widens from edit/delete/pin to include a separate reaction bubble above the actions bubble, of the same width, with horizontal scrolling and a cut-off, fading right edge.

`chat` is deliberately not modified. Its "Standard-set message reactions" requirement specifies the toggle semantics — add when absent, remove when selected again, reject outside accessible channels — and says nothing about *how* the reader picks a reaction. The set also remains a fixed curated constant, which is what the requirement already claims. `responsive-layout` is not modified either: its "Transient overlays stay inside the viewport" scenario already names "a reaction picker" and the new bubble inherits that obligation as written.

## Impact

**Frontend** (`project-js-chat-frontend`)

- `src/components/MessageContextMenu.tsx` — renders a wrapper that owns the pointer coordinates and width, with the reaction bubble above the existing actions bubble. Gains `reactions`, `activeReactions` and `onReact` props.
- `src/components/MessageList.tsx` — stops rendering the footer `+` button and its popover; passes the reaction set and the message's current reactions into the context menu.
- `src/data/emoji.ts` — `REACTION_EMOJIS` grows from 8 to a curated set of about 20, drawn from the `emojiIndex.json` data already bundled in `src/data/`.
- `src/index.css` — wrapper, reaction bubble, the scroll container and its fade mask; removal of the now-dead `.reaction-add`, `.reaction-popover` and `.reaction-popover-item` rules.

**Backend** (`project-js-chat-backend`, a sibling repository that does not use OpenSpec)

Unchanged. `toggleReaction` already broadcasts the full updated message to the channel, and the frontend already calls it.

**Compatibility**

- No protocol, schema or storage change. Reactions that already exist keep rendering as chips; the change is only about how a *new* reaction is chosen.
- Removing the footer `+` means the long-press gesture is now the only way to pick a new reaction on a phone. That gesture is already implemented and already specced; it is also less discoverable than a permanent button, which is the trade this change makes deliberately.
- The mobile bottom-sheet positioning rules currently attached to `.message-context-menu` move to the new wrapper, otherwise the two bubbles would be positioned independently and could drift apart.

**Risks**

- The context menu closes on any scroll event captured at `window` with `capture: true`. A horizontally scrolling reaction bubble emits exactly such an event, so the menu would close on the first swipe unless the handler ignores scrolls originating inside the menu. This is the highest-risk part of the change and is the first thing to verify manually.
- A horizontally scrollable row does not narrow its parent's `max-content` contribution, so sizing the wrapper by content would stretch it to the width of the whole set. The width must be set explicitly and the strip must be allowed to shrink.
- The vertical position clamp currently allows for the actions bubble only. The reaction bubble sits above it, so a message near the top of the viewport needs the clamp extended, or the bubble would be cut off by the top edge.
