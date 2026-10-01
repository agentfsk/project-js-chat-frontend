# Proposal

## Why

The messenger works but presents itself like a debug view rather than a chat: a GIF makes the whole list jump instead of growing the message it belongs to, every message is a bordered card with the avatar crammed into the top-left corner, nothing shows when a message was sent, a message arriving in a chat you are not looking at is silently absorbed, and there is no indication of what you missed. Users expect the Telegram behaviour they already know, and the current presentation actively breaks reading on a phone where a single GIF can push the visible conversation off-screen.

## What Changes

**Stability**

- Reserve the final space of an image or GIF attachment before the image loads, so a slow GIF grows its own bubble instead of displacing the conversation. The list only auto-scrolls to the newest message when the reader is already at the bottom; it never moves the viewport from under someone who has scrolled up.
- Carry the pixel dimensions of an attachment with the message (from the GIPHY response for GIFs, measured client-side for uploaded files) so the reserved box is exact rather than a guess.

**Message presentation**

- Render messages as Telegram-style bubbles: the author's nickname at the top *inside* the bubble, the send time at the bottom-right *inside* the bubble, the avatar *outside* the bubble at the bottom-left.
- Align the reader's own messages to the right, tinted, with no avatar and no nickname.
- Group consecutive messages from the same author (same author and less than five minutes apart) so the avatar and nickname appear once per group, the avatar on the last message and the nickname on the first.

**Notifications**

- Show an in-app toast when a message arrives in a chat the reader is not currently viewing, naming the sender, the conversation, and the opening of the message body. The toast navigates to that conversation when clicked.

**Unread indicators**

- Track per-channel read state on the server and show an unread count on each channel and direct-chat row, capped at `99+`.
- Show the summed unread count on the sidebar tab for direct chats, and on the tab for channels.
- Mark a channel read when it is opened, and mark the active channel read when a message arrives while the tab has focus — including when the tab regains focus.

**Breaking**

- The requirement that the avatar sits next to the nickname in a message header is replaced: the nickname now lives inside the bubble, the avatar outside it, and the reader's own messages carry neither.

## Capabilities

### New Capabilities

- `message-presentation`: How a single message is laid out in a channel — nickname and send time inside the bubble, avatar outside it, own messages mirrored to the right, and consecutive messages from one author grouped.
- `notifications`: In-app toasts that announce a message arriving in a conversation the reader is not currently viewing, and navigation from the toast to that conversation.
- `unread-indicators`: Per-channel read state tracked on the server, unread counts on channel and direct-chat rows, and summed counts on the sidebar tabs.

### Modified Capabilities

- `chat`: the attachment-rendering requirement gains a stable-layout obligation (reserve the final box, never displace the conversation), and the message-header avatar requirement is replaced by the `message-presentation` layout.
- `gif`: a picked GIF is sent with its pixel dimensions so the receiver can reserve the exact space before the image loads.

## Impact

**Frontend** (`project-js-chat-frontend`)

- `src/types.ts` — `Attachment` gains optional `width`/`height`; `Message` gains optional `createdAt`; the data response gains read state.
- `src/components/MessageList.tsx` — restructured message DOM, grouping, send time, bottom-anchored scrolling, reserved attachment box.
- `src/components/MessageForm.tsx` — attach GIF dimensions; measure uploaded images before sending.
- `src/components/ChannelBar.tsx` — unread badges on rows and tab totals.
- `src/socket.ts` — `readChannel` emit, `channelRead` listener, toast trigger, read marking on focus.
- `src/store/unread.ts`, `src/store/toasts.ts`, `src/utils/imageSize.ts`, `src/utils/format.ts`, `src/components/UnreadBadge.tsx`, `src/components/NotificationToast.tsx` — new.
- `src/index.css` — bubble layout, grouping, time, badges, toasts.

**Backend** (`project-js-chat-backend`, a sibling repository that does not use OpenSpec)

- `src/routes.js` — a `reads` map in the in-memory state, read state on the `/api/v1/data` response, and a `readChannel` socket event that answers with a `channelRead` event to the user's own room.

**Compatibility**

- `createdAt` is already stamped on every message by the backend, so no migration is needed for the timestamp. Older in-memory messages that predate the field are rendered without a time rather than failing.
- Attachment dimensions are optional; a message sent without them still renders, with a fallback reserved box.
- The backend holds all state in memory, so read state resets together with the messages on restart. This is consistent with the existing lifetime of a message and needs no persistence work.

**Risks**

- The message list renders every message in the active channel with no virtualisation, and grouping adds a neighbour comparison per row. Acceptable at current volumes; worth revisiting before per-channel history loading is added.
