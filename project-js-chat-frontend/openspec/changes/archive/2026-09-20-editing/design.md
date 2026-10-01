# Design

## Context

See `proposal.md` — Why for motivation. The messenger has a thin backend (Fastify + socket.io, plain JS, in-memory state in `src/routes.js`) and a React frontend (`src/`) speaking REST + socket events. Today a message is only `{ id, body, channelId, username, attachment? }`; the backend never stamps identity, there is no role concept, and there are no edit/delete/pin events. Ownership is not verifiable server-side.

The feature is cross-cutting (backend + frontend, new interaction, security-relevant permissions), so a design is warranted.

## Goals / Non-Goals

**Goals:**
- Server-side, verifiable message ownership and role-based permissions, so authorization does not depend on the client.
- Edit, delete, and pin delivered to all participants in real time, scoped exactly like `newMessage` today (public → all, private → the pair only).
- A single context-menu interaction that works by right-click on desktop and long-press on mobile, showing only permitted actions.

**Non-Goals:**
- Soft-delete placeholders, message history audit, reactions, read receipts, typing indicators.
- Pinned-messages list panel (Slack-style) or pin limits.
- Persisting state across backend restarts (state remains in-memory, matching the existing app).

## Decisions

### 1. Server-stamped authorship on every message
On `newMessage`, the backend sets `userId` (from `socket.userId`), `createdAt`, `edited: false`, `pinned: false` on the stored message and broadcasts the server's object. Client-supplied `username` stays as a display label only; any client-supplied `userId`/identity field is overwritten by the server.
- **Why**: the only secure ownership signal the server has is the JWT-authenticated socket. Username is renamable and client-controlled.
- **Alternative rejected**: trusting the client-sent `username` for ownership — spoofable, breaks on rename.

### 2. Explicit role field on the user
Add `role: 'admin' | 'user'` to the stored user. The seeded `admin` account gets `'admin'`; signup defaults to `'user'`. Expose `role` through `publicProfile` so `GET /api/v1/data`'s `me` carries it to the frontend.
- **Why**: an explicit field, not a hardcoded id or name check, survives renames and expresses intent in the data model.
- **Alternative rejected**: `userId === 1` — fragile; `username === 'admin'` — breaks on rename.

### 3. Three new socket events, mirroring the existing ack pattern
Client → server (acked, `{ status: 'ok' }` | `{ status: 'error', message }`):

```
editMessage   { messageId, body }
deleteMessage { messageId }
pinMessage    { messageId, pinned }        // pinned: boolean toggle
```

On each event the server checks: channel access (`hasAccess`), then the permission matrix below, then mutates `state.messages`, then broadcasts to the channel — public via `app.io.emit`, private via `emitToChannel` (reuse of existing helpers, so private edits/pins/deletes never leak to non-participants).

Server → client broadcasts:

```
messageEdited   { message }                // full updated message object
messageDeleted  { messageId, channelId }
messagePinned   { messageId, channelId, pinned }
```

Permission matrix (enforced server-side):

```
                    | edit/delete own  | edit/delete other | pin in private | pin in public channel
regular user        |        ✓         |        ✗          |       ✓        |        ✗
admin               |        ✓         |        ✓          |       ✓        |        ✓
```

- **Why**: reuses the established ack/broadcast shape (`emitWithAck`, `newMessage` split); keeps one pattern for private vs public scoping.
- **Alternative rejected**: REST endpoints for messages — the whole message flow is socket-based today; mixed transports would complicate ordering.

### 4. No optimistic UI — the server is the source of truth
The frontend applies edits/deletes/pins only when a broadcast (`messageEdited/Deleted/Pinned`) arrives; emitter acks only report errors (→ `setError`).
- **Why**: avoids divergence and rollback logic across multiple clients; consistent with the current send flow (the sender also receives `newMessage`).
- **Trade-off**: slight latency before the message updates; acceptable for single-round-trip operations.

### 5. Edit UX: the composer becomes an edit mode
`ChatPage` owns `editingMessage`; when set, `MessageForm` receives it, prefills the textarea with the current body (attachment left untouched), and swaps the send button for «Сохранить» + «Отмена». Emoji/GIF pickers are reused as-is.
- **Why**: reuses the biggest, most tested input surface on the page and avoids another modal atop the existing ones.
- **Alternative rejected**: dedicated edit modal — extra modal, duplicated textarea/emoji logic.

### 6. One context-menu component, two triggers, two presentations
`MessageContextMenu` is a single menu driven by state `{ message, x, y }`. Desktop: `onContextMenu` with `preventDefault` on the message. Mobile: a touch-timer (≈500 ms) that opens the menu, cancelled on `touchmove`/scroll; the browser's native `contextmenu` is suppressed after the timer fires. On viewports <700px the menu is styled as a near-full-width bottom sheet. Closing: outside click, Escape, scroll, or choosing an action.
- **Why**: one menu component keeps behavior identical across input modes; CSS media query handles the mobile presentation without extra logic.
- **Alternative rejected**: separate mobile menu/list — duplicates logic for no gain.

### 7. Pin surfacing: store flag + banner + badge
`Message` carries `pinned`; the chat store selects the pinned message of the current channel (`selectPinnedMessage`). `PinnedMessageBanner` renders at the top of `ChatPage` from that selector and scrolls to the message (scroll by message id, using the auto-scroll pattern already in `MessageList`). Messages render a pin badge when `pinned`. Deleting a pinned message removes both (server clears pin state; broadcast `messageDeleted` plus a pin-clear).
- **Why**: minimal data flow, no extra persistence; matches the «banner + indicator» choice made in exploration.

## Risks / Trade-offs

- **In-memory state**: edits, pins, and deletes vanish on backend restart (as all data already does). → Mitigation: nothing new; acceptable for this app's persistence model.
- **Client-supplied `username` still displayed**: display and ownership diverge if a crafted client lies. → Mitigation: ownership/actions are keyed on server `userId`; display spoofing is cosmetic and pre-existing.
- **Long-press clashes with scrolling/selection on mobile**: text selection or scroll may start before the timer fires. → Mitigation: cancel the timer on `touchmove` past a small threshold and on scroll; only trigger the menu when the press stays put.
- **Concurrent edit/delete of the same message**: two clients act on one message. → Mitigation: the server resolves by `messageId` and can reject with `{ status: 'error' }`; frontend surfaces the ack error; no optimistic state to reconcile.
- **Frontend/backend contract coupling**: new events require a coordinated deploy. → Mitigation: old frontend ignores unknown broadcasts safely (log-level warning); new frontend against an old backend simply lacks the features; document as a paired release.

## Migration Plan

- Deploy backend and frontend together (the socket contracts are new and additive — no existing event changes).
- Rollback: revert the backend events/fields and redeploy the previous frontend build; no data migration is involved since state is in-memory.

## Open Questions

- Whether an admin-edited message should also record *who* edited it (an `editedBy`/`editedAt` field for audit beyond the «изменено» badge). Deferrable — the spec only requires the edited indicator.
- Whether edits should be restricted (e.g., to text-only messages or within a time window). Deferrable — the spec permits editing the body of any message the user may edit.