# Design

## Context

See `proposal.md` for motivation. The constraints that shape the approach:

**Message data is delivered whole and held whole.** `GET /api/v1/data` returns every message of every channel the user can access, and the client keeps them in one flat array (`store/chat.ts`). There is no pagination, no per-channel fetch, and no windowing. Unread counting is therefore a local computation over data the client already has.

**The backend keeps all state in memory.** `const state = buildState(defaultState)` closes over `routes.js`, with no database and no file. Read state added here has the same lifetime as the messages it refers to.

**Attachment metadata is not validated server-side.** `newMessage` builds `{ ...messageFields, id, userId, createdAt, ... }` and pushes it. Anything the client puts inside `attachment` is stored and rebroadcast verbatim. Extra fields are free.

**Timestamps already exist.** The backend stamps `createdAt: new Date().toISOString()` on every message (`routes.js:208`). The frontend's `Message` type simply does not declare it. No migration, no backfill.

**Per-user socket rooms already work.** On connect the server joins the socket to `user:${userId}` (`plugin.js:40`), and `emitToChannel` already addresses it. Targeted delivery to one user's other tabs is available for free.

**There are no tests and no test runner** in either repository. Every one of these behaviours is verified by hand.

**Two repositories.** The backend is a sibling project that does not use OpenSpec, so its work is tracked in this change's tasks but lands in another repository.

## Goals / Non-Goals

**Goals:**

- A slow GIF never moves a message the reader is not looking at.
- The message list only moves the viewport when the reader asked it to.
- Read state is authoritative and shared across the reader's own sessions.
- Each new concern gets its own small store rather than growing the chat store.

**Non-Goals:**

- Typing indicators. The `typing` signal needs a new server event and a throttle, and previewing what someone is typing means shipping keystrokes to the server. Deliberately excluded; `notifications` covers delivered messages only.
- Date separators between days ("вчера", "17 сентября"). The bubble shows a time of day; grouping across a day boundary is out of scope.
- Virtualisation or per-channel history loading. Grouping and unread counting both scan the active list, which is cheap at current volumes.
- Operating-system notifications, a service worker, or any notification permission.
- Persisting read state across backend restarts, which would mean introducing storage to a backend that deliberately has none.

## Decisions

### Dimensions travel in the message, they are not probed at render time

An image attachment carries optional `width`/`height`. GIFs take them from the GIPHY response, which already reports both (`api/giphy.ts`); uploaded files are measured once before sending.

Alternatives considered. Probing in the browser at render time works without touching the payload, but the first paint still collapses to a zero-height box and only grows once the probe resolves — that is the very jump being fixed, merely smaller. A server-side measurement in the upload handler is authoritative but needs an image library the backend does not have, for a cosmetic concern.

Cost of this choice: messages that predate the field, or GIFs sent by an older client, have no dimensions. Those fall back to a reserved placeholder box, so they are stable but not exactly sized. Worth it for zero backend work and no extra requests.

### Read state is a timestamp per channel, not a message id

`state.reads[userId] = { firstSeenAt, byChannel: { [channelId]: lastReadAt } }`. Unread means `message.createdAt > max(firstSeenAt, lastReadAt) && message.userId !== me.id`.

Alternatives considered. `lastReadMessageId` looks tighter, but a channel created *after* the reader's first visit has no read record, so on the next load the baseline rule would stamp it fully read and silently swallow the messages that arrived while the reader was away. A timestamp needs no such special case: those messages are newer than `firstSeenAt` and count. A `joinedAt`-style column would repair the id variant at the cost of the same field the timestamp already provides.

`firstSeenAt` exists so that a first-time reader is not shown an unread badge for the entire backlog. It is set lazily on the reader's first data load, not at signup, so the baseline reflects when they actually arrived.

### The client counts; the server only remembers

The server stores read points and never counts. The client derives each count from the message list it already holds, and caps the display at `99+`.

The alternative — a server-computed count in the data response — is a second source of truth that can disagree with the list the client renders, and it would need its own logic for the same `firstSeenAt` and own-message rules. A scan of the active channel's messages is cheap and cannot drift.

The scan is memoised per channel so that the sidebar total is a sum over per-channel counts rather than a rescan of the whole list.

### Read marking is driven by attention, not by the open channel alone

`readChannel` is emitted when the reader opens a channel, when a message arrives in the open channel **and** `document.hasFocus()`, and when the window regains focus with a channel open. A message that arrives in the open channel of a backgrounded tab stays unread.

Marking on channel switch alone would be wrong in the common case: a tab left open on a channel all afternoon would show zero unread for messages that arrived while it was in the background.

`document.hasFocus()` is the signal rather than `visibilityState`, because focus is the stricter and more accurate reading of "the reader is looking at this".

### Read state is broadcast only to the reader's own room

`readChannel` answers with an ack and emits `channelRead` to `user:${senderId}` only.

Read state is private, so there is nothing to tell other participants. Emitting to the sender's own room is what makes a second window of the same account clear its badge, using machinery (`plugin.js:40`) that already exists. The handler re-checks channel access, so a client cannot mark a conversation it cannot see.

### Auto-scroll becomes bottom-anchored

The unconditional `bottomRef.scrollIntoView({ block: 'end' })` on every `messages` change is replaced with a tracked `atBottom` flag updated from the scroll listener that already exists for closing the context menu. New messages scroll the view only when the flag is set, and an image's `onLoad` re-pins only when the flag is still set.

This addresses the reported symptom at its source. `overflow-anchor` alone was rejected: it stabilises content already in view, but an image that grows by 260px at the bottom of the list still moves the content above it, and the browser's implementation of scroll anchoring varies enough across mobile engines that a behaviour this visible should not be delegated to it.

The flag is deliberately not sticky across channel switches. Opening a channel should land at its newest message, which is what the flag gives on the first scroll event after the switch.

### Grouping is a 5-minute window keyed on the author id

Consecutive messages merge when `prev.userId === cur.userId` and `createdAt` is under five minutes older. Identity is compared by `userId`, never by `username`, because usernames change (`renameUser` rewrites every message) and comparing strings would re-group a conversation after a rename.

A message without `createdAt` cannot be placed on a timeline, so it is rendered as its own group rather than guessed at. Merging on author alone was rejected because a user who returns after an afternoon would get one continuous group; a wider window has the same problem.

The nickname goes on the first message of a group and the avatar on the last. This asymmetry is deliberate: the group is bottom-aligned, so the avatar reads as belonging to the whole run of messages rather than to the one it happens to sit beside.

### The direct-chats tab totals every private chat it lists

The «Личные» tab renders every private chat, including peers who are not contacts, so its total counts all of them.

The alternative — counting only accepted contacts — would make the total disagree with the rows above it, since a non-contact row can show a count that the tab total ignores. A total that does not add up is worse than a total that includes a chat the reader can still see and open.

### Toasts are in-app and transient

A bounded stack of at most three, each auto-hiding after a few seconds, each clickable to open its conversation. Suppressed for the reader's own messages and for the conversation on screen.

`Notification` API and service workers were rejected: they need a permission the reader may refuse, and they cannot be verified in this codebase. The toast is the part that works while the tab is open, which is what was asked for.

### Three new small stores, no growth of the chat store

`store/chat.ts` owns channels and messages. `store/unread.ts` owns read points and the derived counters; `store/toasts.ts` owns the ephemeral notice stack. They are separate because read state has a different lifetime from message data (it survives a message being deleted) and toasts have none at all.

The unread selectors are plain functions over state, matching the existing `selectActiveChannelMessages` pattern, so they compose with `useShallow` the way current code does.

### The message row is restructured, its identity is not

```
before                          after
.message (col)                  .message        (row, align-items: flex-end)
  .message-head                   .message-avatar
    Avatar  .message-user          .message-bubble  (col)
  .message-content                   .message-user
  .message-reactions                 .message-content
                                     .message-foot   -> "изменено" + time
                                   .message-reactions
```

`data-message-id` stays on the outer `.message` row, so `scrollToMessage` — which queries it and calls `scrollIntoView` — and the context menu's long-press and right-click handlers keep working untouched. The pinned and editing outlines move to `.message-bubble`, since the bubble is now the visible surface.

## Risks / Trade-offs

- **Backend restart clears read state** → consistent with messages themselves being cleared, and covered by a scenario rather than worked around. A user returning to a restarted server sees a clean slate, not a wrong count.
- **Grouping adds a neighbour comparison and a fresh array per render** → the message list already re-renders on every socket event, so this adds a comparison rather than a new class of problem. Revisit together with virtualisation, which is when the list stops being cheap.
- **Image probing before sending can hang** if the uploaded URL is unreachable → the probe is bounded by a timeout and falls back to sending without dimensions. A send must never be blocked by a cosmetic measurement.
- **`aspect-ratio` on the attachment box** → supported across current mobile engines, and the fallback is a fixed-ratio placeholder, which degrades to "stable but not exact" rather than to a jump.
- **Cross-store reads in one render** → `ChatPage` already reads four stores; the additions are shallow selectors over small slices, and the toast stack is capped.
- **The read scan runs over the whole message list** → memoised per channel and summed from per-channel counts. If a `data` payload ever grows enough for this to matter, the same change is where per-channel history loading belongs.
- **Two repositories, one change** → backend work is tracked in `tasks.md` but lands in a project outside this OpenSpec root. Deployment order is specified below so the frontend is never ahead of the server.

## Migration Plan

1. Deploy the backend first: the `reads` map, the read state on the data response, and the `readChannel` event. Additive and inert until a client uses it.
2. Deploy the frontend. It treats a missing `readState` in the data response and a rejected `readChannel` as non-fatal, so a frontend that reaches a backend without step 1 degrades to no unread counts rather than to an error.
3. Roll back either side independently. Removing the frontend restores the previous presentation. Removing the backend's additions leaves the frontend emitting an event nobody handles and reading a field that is not there — both already tolerated.

## Open Questions

- Should the document title and favicon also carry an unread indicator while the application is in the background? It is a natural follow-up to `unread-indicators` and touches no existing requirement, but it was not asked for, so it is not built here.
