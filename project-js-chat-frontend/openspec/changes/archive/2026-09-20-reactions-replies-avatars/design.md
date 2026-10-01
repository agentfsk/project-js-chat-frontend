# Design: Message reactions, replies, and avatars

## Context

One source of truth on the backend is `state.messages` in `project-js-chat-backend/src/routes.js`; messages are objects created in the `newMessage` socket handler and delivered raw through `GET /api/v1/data`, `newMessage`, and updated-message broadcasts (`messageEdited`, `messagePinned`). Access/scoping helpers already exist: `findMessageAndChannel`, `hasAccess`, `isAdminUser`, `emitToChannel`. The frontend (`project-js-chat-frontend`) keeps a flat `messages` array in the zustand chat store, updates it only from server broadcasts (no optimistic UI), and renders each message head in `MessageList.tsx` with a nickname and edit/pin badges. Avatars already exist for profiles (`Avatar.tsx`, `useUsersStore.profiles` keyed by user id) and in the direct-message sidebar rows, but not in message headers or the direct-message title.

## Goals / Non-Goals

Goals:
- Standard-set emoji reactions on messages, toggled per participant, delivered in real time, included in history.
- Inline reply with a clickable quote that jumps to the original message.
- Author avatar next to nickname in message headers; peer avatar next to the channel name in the direct-message title.

Non-Goals:
- Threads, reaction counters/leaderboards, or analytics on reactions.
- Cascade deletion or re-parenting of replies when the original is deleted (a stale snapshot is acceptable).
- Reaction/reply persistence beyond the in-memory backend state (consistent with the rest of the product).
- Optimistic UI for reaction toggles (consistent with edit/delete/pin).

## Decisions

### D1. Reactions stored as an array on the message object
`reactions: { userId: number; emoji: string }[]`, initialized to `[]` on every new message. Keeping it on the message means history (`/api/v1/data`), broadcasts, and edit frames all carry it unchanged. Counts are derived client-side by grouping by emoji.
- Alternative considered: a separate reactions map keyed by message id — rejected, adds a second source of truth and requires extra plumbing in history and broadcasts.

### D2. One `toggleReaction` socket event with full-message broadcast
Client→server `toggleReaction { messageId, emoji }` (ack `{status:'ok'}` / `{status:'error', message}`), server→client `messageReacted` carrying the full updated message, delivered via `emitToChannel`. Toggle by server: if the requesting `userId` already reacted with that emoji → remove, else append.
- Rationale: one round-trip, idempotent-ish toggle, matches the existing `pinMessage`/`messagePinned` and `messageEdited` broadcast patterns. The frontend listener reuses the existing `updateMessage` store action.
- Alternative considered: separate `addReaction`/`removeReaction` events — rejected, doubles the contract for no benefit.

### D3. Replies are plain messages with a `replyTo` snapshot
`newMessage` accepts an optional `replyToId`. The server validates the target exists and is accessible via `findMessageAndChannel` + `hasAccess`, then stamps `replyTo: { id, body, username, userId, attachment? }` onto the new message. No new event; delivery reuses `newMessage`.
- Rationale: replies must survive via `/data`, arrive before the parent handler changes state, and need no dedicated broadcast. Snapshot (not just id) lets the client render the quote even if the original is later deleted; the id enables jump-to.
- Alternative considered: client resolves `replyToId` through `/data` — rejected, breaks when the target is loaded after the reply and when the target is deleted.

### D4. Standard reaction set lives in frontend data and is not validated server-side
`REACTION_EMOJIS = ['👍','❤️','😂','🔥','👏','😮','😢','🎉']` exported from `src/data/emoji.ts`. The server accepts any string emoji; the client only offers the standard set. Rationale: the server has no emoji authority, and enforcing a server-side allowlist adds indirection without a spec requirement.

### D5. Avatar rendering is data-driven from the users store
Message headers resolve the author's profile from `useUsersStore.profiles[message.userId]` and fall back to the initial placeholder when missing; the direct-message title resolves the peer from `channel.participants` minus the current user. `Avatar.tsx` (`username`, `src`, `size`) already handles image vs. placeholder. No backend changes needed — `avatarUrl` is already exposed via `publicProfile` and `userUpdated`.

### D6. Reactions UI is always visible (no hover-only) for touch support
A reactions row under the message body shows chips (emoji + count, own reactions highlighted) and a `+` button opening a popover with `REACTION_EMOJIS`. Always-visible avoids hover-or-tap inconsistency on mobile.

## Risks / Trade-offs

- Stale `replyTo` after the original is deleted → accepted; the quote remains readable and jump falls back to doing nothing when the target id is absent from the list.
- Renaming a user re-attributes `username` on messages but `userId` stays stable; the reply snapshot keeps the author's `username` at reply time (fine for a quote snapshot), while avatar resolution keys off `userId`.
- Arbitrary emoji payloads from clients are stored as strings → cleaned by the client's standard-set UI; no sanitization concern (plain emoji text, no injection surface).
- `/data` grows slightly per message; negligible for an in-memory messenger of this size.

## Migration Plan

In-memory state only; on deploy the new fields (`reactions`, `replyTo`) simply coexist with old messages (both optional/absent on legacy entries). The frontend renders correctly without them. Rollback = revert the frontend commit and backend commit independently; no schema migration to undo.

## Open Questions

None material to the contract; jump-to-scroll behavior and exact reaction set can be tuned without spec changes.