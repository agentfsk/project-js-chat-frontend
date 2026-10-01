# Tasks

## 1. Backend — authorship and role model

- [x] 1.1 Stamp authorship and lifecycle on `newMessage` (src/routes.js): set `userId` from `socket.userId`, plus `createdAt`, `edited: false`, `pinned: false` on the stored message, and broadcast the server's object while overwriting any client-supplied identity field. Verify: a client sending a forged `username`/`userId` still yields a message whose `userId` equals the authenticated sender in `GET /api/v1/data`.
- [x] 1.2 Add a `role` field to stored users: the seeded `admin` account gets `role: 'admin'`, signup defaults to `role: 'user'`. Verify: logging in as `admin` returns `role: 'admin'` in the `me` payload; a newly registered user returns `role: 'user'`.
- [x] 1.3 Expose `role` in `publicProfile`. Verify: user search and profile responses include `role`.

## 2. Backend — message event handlers

- [x] 2.1 Add `editMessage { messageId, body }` handler: check channel access, allow only the author or an admin, update the body, set `edited: true`, ack `{ status: 'ok' }`, broadcast `messageEdited { message }` scoped to the channel. Verify: an author edit updates the message for all participants over the socket; a non-author non-admin gets an error ack and no broadcast.
- [x] 2.2 Add `deleteMessage { messageId }` handler: check channel access, allow only the author or an admin, remove the message from `state.messages`, clear its pinned state, ack, broadcast `messageDeleted { messageId, channelId }`. Verify: the message disappears for all participants and on reload; deleting a pinned message also clears its pin.
- [x] 2.3 Add `pinMessage { messageId, pinned }` handler: check channel access, allow any participant in a private channel but only an admin in a public channel, set the `pinned` flag, ack, broadcast `messagePinned { messageId, channelId, pinned }`. Verify: a non-admin pin in a public channel is rejected with an error ack, and succeeds in a private chat.
- [x] 2.4 Keep private-channel broadcasts scoped to the pair only (reuse `emitToChannel`/`user:{id}` rooms) for all three events. Verify: edit/delete/pin in a private chat are not received by sockets outside the pair.

## 3. Frontend — data layer

- [x] 3.1 Extend `Message` in src/types.ts with `userId: number`, `edited: boolean`, `pinned: boolean`, and `UserProfile` with `role?: 'admin' | 'user'`. Verify: `npm run build` passes.
- [x] 3.2 Add chat-store actions (src/store/chat.ts): `updateMessage` (replace by id, used for edits and pins), `removeMessage` (drop by id), and a `selectPinnedMessage` selector for the current channel. Verify: store unit behavior works when replying to broadcasts in step 3.3.
- [x] 3.3 Wire src/socket.ts: listeners `messageEdited`, `messageDeleted`, `messagePinned` into the store, and acked emitters `emitEditMessage`, `emitDeleteMessage`, `emitPinMessage` that surface ack errors via `setError`. Verify: two browser sessions against the updated backend reflect edits, deletes, and pins live in both.

## 4. Frontend — context menu

- [x] 4.1 Create `MessageContextMenu` (new component): renders a positioned menu at `{ x, y }` with callbacks for edit/delete/pin, closes on outside click, Escape, and scroll. Verify: menu opens at the pointer, closes on all three triggers.
- [x] 4.2 Open the menu on right-click in `MessageList` via `onContextMenu` with `preventDefault`. Verify: browser context menu is suppressed and the app menu appears on desktop.
- [x] 4.3 Open the menu on mobile long-press (touch timer ≈500 ms in `MessageList`), cancel it on `touchmove` beyond a small threshold or on scroll, and suppress the native `contextmenu` after the timer fires. Verify: long-press opens the menu on a touchscreen; scrolling or dragging does not.
- [x] 4.4 Add a permissions helper (e.g. src/utils/permissions.ts): `isAdmin` from `me.role`, `canEdit`/`canDelete` = author or admin, `canPin` = private channel participant or admin, and filter menu items by it. Verify: the menu shows only the permitted actions for owner, admin, and outsider cases.
- [x] 4.5 Wire the menu actions to the emitters from step 3.3 and to edit mode from step 5. Verify: Edit/Delete/Pin/Unpin items perform their action end to end.

## 5. Frontend — edit mode

- [x] 5.1 Hold `editingMessage` state in `ChatPage`, pass it to `MessageForm`, and wire `onCancelEdit`. Verify: editing a message highlights it in the list and cancelling restores the plain composer.
- [x] 5.2 Add edit mode to `MessageForm`: prefill the textarea with the current body, keep the attachment unchanged, replace the send button with «Сохранить»/«Отмена», reuse the emoji picker, and emit `emitEditMessage` on save. Verify: saving updates the message, shows the «изменено» indicator, and the form resets.

## 6. Frontend — delete and pin surfacing

- [x] 6.1 Render the «изменено» badge and pin badge on messages in `MessageList` from the new fields. Verify: edited and pinned messages show their indicators.
- [x] 6.2 Create `PinnedMessageBanner` and render it at the top of `ChatPage` from `selectPinnedMessage` of the current channel; clicking it scrolls to the pinned message and returns the list to end on plain scroll. Verify: banner appears for a pinned message, is absent otherwise, and click scrolls to it.
- [x] 6.3 Style the context menu, badges, and banner in src/index.css, with the menu as a near-full-width bottom sheet under 700px. Verify: layout is correct on desktop and at narrow viewport widths.

## 7. Verification

- [x] 7.1 Run `npm run lint` and `npm run build` in the frontend repo and `npm run build` in the backend repo with no errors.
- [x] 7.2 End-to-end manual pass against the running backend covering the full matrix: own vs admin edit/delete, pin in DM vs channel, edited/pin badges, banner scroll, and long-press menu on a touchscreen/mobile viewport.