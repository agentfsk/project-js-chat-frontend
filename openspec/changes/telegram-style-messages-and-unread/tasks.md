# Tasks

## 1. Backend: read state (sibling repo `project-js-chat-backend`)

- [x] 1.1 Add a `reads` map to the in-memory state in `src/routes.js`, holding per user a `firstSeenAt` created lazily on that user's first access and a `byChannel` map of channel id to last-read timestamp
- [x] 1.2 Return the reader's read state from `GET /api/v1/data` as `readState` with `firstSeenAt` and a `lastReadAtByChannel` array of `{ channelId, lastReadAt }` pairs, using an array rather than an object so numeric channel ids stay numeric through JSON — verify by loading `/api/v1/data` and confirming `readState.firstSeenAt` is set and `lastReadAtByChannel` is an array
- [x] 1.3 Add a `readChannel` socket event that finds the channel, rejects with an ack error when the socket user has no access to it, and otherwise records the present timestamp for that user and channel — verify by calling it for a private channel of another user and confirming the ack reports an error
- [x] 1.4 Have `readChannel` emit `channelRead` with the channel id and the new timestamp to `user:${socket.userId}` only — verify with two browser sessions of the same account that a read in one clears the other's view, and with a third account that it sees nothing

## 2. Frontend types and plumbing

- [x] 2.1 Add optional `width`/`height` to `Attachment` and optional `createdAt` to `Message` in `src/types.ts`
- [x] 2.2 Add `readState` to the `DataResponse` type in `src/api/data.ts` and thread it through the load in `src/pages/ChatPage.tsx`
- [x] 2.3 Add `formatTime` to `src/utils/format.ts` rendering an ISO timestamp as a 24-hour time of day, returning an empty string for a missing or unparseable value
- [x] 2.4 Add `src/utils/imageSize.ts` exporting a bounded image measurement that resolves the pixel size of a URL, gives up after a short timeout, and resolves to null rather than rejecting when the image cannot be read
- [x] 2.5 Verify with `pnpm lint` and `npx tsc -b` that the frontend still type-checks and lints clean

## 3. Message presentation (Telegram-style bubbles)

- [x] 3.1 Restructure the row in `src/components/MessageList.tsx` into an outer `.message` row holding an avatar outside the bubble and a `.message-bubble` column holding the nickname, the existing content, and a footer with the edited badge and the send time
- [x] 3.2 Add an own-message modifier keyed on `userId === me.id` that mirrors the bubble to the right, tints it, and omits both avatar and nickname — verify that a message sent by the logged-in user renders right-aligned with neither, in a direct chat
- [x] 3.3 Group consecutive messages by `userId` within a five-minute `createdAt` window, drawing the nickname only on the first message of a group and the avatar only on the last, and rendering a message without `createdAt` as its own group — verify with three messages from one author inside five minutes, then a fourth from another author
- [x] 3.4 Keep `data-message-id` on the outer row and verify that the pinned banner, a reply quote click, and the context menu all still scroll to and open on the right message after the restructure
- [x] 3.5 Restyle in `src/index.css` for the row/bubble layout, own-message tint, the time in the footer, and the pinned and editing outlines on the bubble, then verify the layout on a desktop viewport and at 375px width with no horizontal scrolling

## 4. Stable attachment layout (the GIF jump)

- [x] 4.1 Send the GIPHY-reported dimensions with a picked GIF in `src/components/MessageForm.tsx` and measure uploaded images with `probeImageSize` before emitting, so both paths carry dimensions and a failed probe still sends
- [x] 4.2 Render the attachment image with its declared width and height and an `aspect-ratio`, falling back to a fixed-ratio placeholder box when dimensions are absent — verify with a throttled connection that a GIF's bubble is already full height before the image arrives
- [x] 4.3 Replace the unconditional scroll-to-bottom in `src/components/MessageList.tsx` with an `atBottom` flag fed by the existing scroll listener, so new messages and late-loading images scroll the view only while that flag is set — verify by scrolling up on a phone-sized viewport, then loading a GIF: the visible text must not move, and with the flag set the newest message must stay in view
- [x] 4.4 Confirm the four scenarios under the `chat` attachment requirement by hand, including that a long nickname on a narrow screen still truncates rather than displacing the preview

## 5. Unread indicators

- [x] 5.1 Add `src/store/unread.ts` holding `firstSeenAt` and `lastReadAtByChannel`, with a per-channel unread selector counting messages from other participants newer than `max(firstSeenAt, lastReadAt)`, capped for display at `99+`
- [x] 5.2 Add a `readChannel` emit to `src/socket.ts` and a `channelRead` listener that updates the local read point, so a read in another window of the same account clears the badge here
- [x] 5.3 Emit `readChannel` when the reader opens a channel, when a message arrives in the open channel while `document.hasFocus()`, and when the window regains focus with a channel open — verify that a tab left in the background accumulates counts and clears them on refocus
- [x] 5.4 Add `src/components/UnreadBadge.tsx` and render it on the public channel row and the direct chat row in `src/components/ChannelBar.tsx`, hidden at zero
- [x] 5.5 Sum the per-channel counts onto the «Личные» and «Каналы» tabs, count every private chat the tab lists including non-contacts, and cap each tab total at `99+`
- [x] 5.6 Verify by hand: a first-time reader sees no badges on the existing backlog, a second reader of the same channel is unaffected by the first reader's read actions, and counts survive a page reload

## 6. In-app notices

- [x] 6.1 Add `src/store/toasts.ts` holding a stack capped at three entries, each carrying the sender, the conversation, and a leading fragment of the body, with a per-entry auto-hide
- [x] 6.2 Raise a notice from the `newMessage` handler in `src/socket.ts` for conversations other than the open one, and for nothing else — verify that the reader's own message and a message in the open conversation raise nothing
- [x] 6.3 Add `src/components/NotificationToast.tsx` rendering the stack, naming the peer for a direct chat and the channel name for a public channel, and describing an attachment-only message by its kind instead of showing empty text
- [x] 6.4 Make a notice open its conversation when activated and close the mobile drawer, and drop notices for the conversation that was just opened — verify on a 375px viewport that a burst of messages leaves the composer reachable

## 7. Integration check

- [ ] 7.1 Walk the `unread-indicators` and `notifications` scenarios end to end with two browser sessions against a running backend, confirming the counts, the tab totals, the cross-window read clearing, and the notices
- [x] 7.2 Confirm the application still starts with the backend's read-state additions absent, degrading to no unread counts rather than to an error
- [x] 7.3 Run `pnpm lint`, `npx tsc -b`, and `pnpm build` and confirm all pass

> Not verified here: 7.1 and the visual parts of 5.3, 5.6 and 6.4 need a real browser
> session, and this environment has no browser or browser automation installed.
> The server contract behind them was checked with socket clients and the counting
> and notice rules were checked as compiled logic, but the rendered result, the
> 375px composer check and the GIF and bubble visuals still need a human pass.