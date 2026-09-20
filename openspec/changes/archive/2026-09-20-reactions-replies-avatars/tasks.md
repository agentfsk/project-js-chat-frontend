# Tasks: Message reactions, replies, and avatars

## 1. Backend — reactions

- [x] 1.1 Add `reactions: []` to the message object created in the `newMessage` socket handler (`src/routes.js`). Verify: `node --check src/routes.js` passes.
- [x] 1.2 Add a `toggleReaction` socket handler: resolve via `findMessageAndChannel` + `hasAccess`, reject inaccessible channels with an ack error, toggle the reacting user's `{userId, emoji}` entry (remove if present, append otherwise), then broadcast `messageReacted` with the full updated message via `emitToChannel`. Verify: `node --check src/routes.js` passes and the E2E script shows ack ok / error and scoped broadcasts.

## 2. Backend — replies

- [x] 2.1 In the `newMessage` handler accept an optional `replyToId`, resolve the target via `findMessageAndChannel`, reject the reply with an ack error if the target is missing or inaccessible, and stamp `replyTo: { id, body, username, userId, attachment? }` on the new message before broadcasting. Verify: `node --check src/routes.js` passes.

## 3. Frontend — types and socket

- [x] 3.1 Extend `Message` in `src/types.ts` with `reactions?: { userId: number; emoji: string }[]` and `replyTo?: { id: number; body: string; username: string; userId: number; attachment?: Attachment }`. Verify: `pnpm run build` passes.
- [x] 3.2 Add `emitToggleReaction(messageId, emoji)` and a `replyToId` parameter to `emitNewMessage` in `src/socket.ts`, plus a `messageReacted` listener calling the existing `updateMessage` store action. Verify: `pnpm run build` passes.

## 4. Frontend — reactions UI

- [x] 4.1 Export `REACTION_EMOJIS = ['👍','❤️','😂','🔥','👏','😮','😢','🎉']` from `src/data/emoji.ts`. Verify: `pnpm run build` passes.
- [x] 4.2 In `MessageList.tsx` render a reactions row under each message body: chips of emoji+count (own reactions highlighted) and a `+` button opening a popover of `REACTION_EMOJIS`; clicking a chip or popover emoji calls `onMessageReaction(message, emoji)`; popover closes on outside click/Escape. Verify: manual check in `pnpm run dev` and `pnpm run lint` passes.
- [x] 4.3 Wire `onMessageReaction` through `ChatPage.tsx` to `emitToggleReaction` with error handling via the chat store error. Verify: `pnpm run build` passes.

## 5. Frontend — replies

- [x] 5.1 Add a `reply` action (`id: 'reply'`, label «Ответить», always available) to `MessageMenuAction` in `MessageContextMenu.tsx` and to `buildActions`/`handleMenuSelect` in `MessageList.tsx`. Verify: `pnpm run build` passes.
- [x] 5.2 Add `replyingMessage` state (derived from `replyingMessageId`, same pattern as `editingMessage`) and `handleReply` in `ChatPage.tsx`; pass `onReply` to `MessageList` and `replyingMessage`/`onCancelReply` to `MessageForm`; pass `replyToId` on message send. Verify: `pnpm run build` passes and replying in a channel shows the reply banner.
- [x] 5.3 In `MessageList.tsx` render a `message-reply` quote block (author + avatar + text) above the message body; clicking it scrolls the original into view via the existing `scrollToMessage` ref. Verify: clicking a quote scrolls to the original message.

## 6. Frontend — avatars

- [x] 6.1 Render the author's `Avatar` next to `message-user` in the `MessageList` message head, resolving the profile from `useUsersStore.profiles[message.userId]` with the initial-placeholder fallback. Verify: messages in a channel and in a direct chat show the author avatar (placeholder when unset).
- [x] 6.2 Show the peer's `Avatar` next to the channel name in the private-channel `channel-title` in `ChatPage.tsx` (peer = `participants` minus the current user, resolved from `profiles`). Verify: opening a direct chat shows the peer avatar in the header.

## 7. Styles and validation

- [x] 7.1 Add styles in `src/index.css` for `.message-reactions`, reaction chips/popover, `.message-reply`, and message-head avatar so the new UI matches the existing theme. Verify: `pnpm run build` passes.
- [x] 7.2 Run `pnpm run build` and `pnpm run lint` on the frontend and `eslint` + `node --check` on the backend — all clean. Verify: commands exit 0.
- [x] 7.3 Run the E2E contract script against a running backend: reaction toggle (add/remove, another user's count, private-channel scoping, outsider rejection), reply with `replyToId` (snapshot fields present in `/data` and broadcast), ack errors. Verify: all assertions PASS.
- [x] 7.4 Run `openspec validate reactions-replies-avatars` and confirm the change is valid. Verify: command reports the change is valid.