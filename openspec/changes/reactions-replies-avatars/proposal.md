# Proposal: Message reactions, replies, and avatars

## Why

The chat lacks basic modern messaging affordances: users cannot react to a message with an emoji (let alone a compact standard set), cannot reply to a specific message, and message headers show only a nickname — no avatar — which makes conversations harder to scan, especially in direct messages.

## What Changes

- **Message reactions**: any channel participant can toggle an emoji reaction from a fixed standard set (e.g. 👍 ❤️ 😂 🔥 👏 😮 😢 🎉) on any accessible message. Reactions are stored on the message (`reactions: { userId, emoji }[]`), delivered to the channel in real time as a `messageReacted` event carrying the full updated message, and included in history via `/api/v1/data`. Each participant's own reactions are highlighted; tapping the same emoji again removes it.
- **Reply to a message**: a message can be sent as a reply carrying a `replyTo` snapshot (`{ id, body, username, userId, attachment? }`) of the original. The client renders a clickable quote of the original above the reply text, and clicking it scrolls to the original message. Replies are ordinary messages (`newMessage` + `replyToId`), so no new socket event is needed.
- **Avatars next to nicknames**: the message header renders the author's avatar next to the nickname (in both public channels and direct messages), and the private-channel title in the chat header shows the peer's avatar next to the channel name.

All reaction and reply data lives in the backend's in-memory state alongside the rest of the chat data, so it resets on server restart like the rest of the chat. No optimistic UI: client state updates only from server broadcasts, matching the existing edit/delete/pin behavior.

## Capabilities

**Modified Capabilities** (delta specs):
- `chat` — messages gain reactions and reply quotes; reactions are delivered in real time scoped to channel access and included in history; message headers render the author's avatar.
- `profiles` — the user's avatar is shown next to their nickname in message headers and in the private-channel title, not only in profile views.

**New Capabilities**: none.

## Impact

- **Backend** (`project-js-chat-backend`): `src/routes.js` — `reactions: []` field on new messages, `replyTo` snapshot creation in the `newMessage` handler, new socket event `toggleReaction` (ack-based) and its `messageReacted` broadcast using the existing `findMessageAndChannel` / `hasAccess` / `emitToChannel` helpers.
- **Frontend** (`project-js-chat-frontend`):
  - `src/types.ts` — `Message.reactions`, `Message.replyTo`.
  - `src/socket.ts` — `emitToggleReaction`, `emitNewMessage(..., replyToId)`, listener `messageReacted`.
  - `src/data/emoji.ts` — exported `REACTION_EMOJIS` standard set.
  - `src/components/MessageList.tsx` — avatar in `message-head`, reactions row (chips + standard-set popover), reply quote block with jump, `onReply` prop.
  - `src/components/MessageContextMenu.tsx` — new always-available `reply` action.
  - `src/components/MessageForm.tsx` — reply mode (banner + `replyToId` on send).
  - `src/pages/ChatPage.tsx` — `replyingMessage` state + `onReply`, peer avatar in the private-channel title.
  - `src/index.css` — styles for reactions, reply quote, avatars.
- **Tests**: `pnpm run build` / `pnpm run lint` on the frontend; `eslint` + `node --check` on the backend; an E2E script exercising `toggleReaction` and `replyToId` contracts against a running backend (ack statuses, scoped broadcasts, history fields).