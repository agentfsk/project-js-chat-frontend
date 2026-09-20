# Proposal

## Why

Users can only send and receive messages: nothing can be corrected after sending, removed, or highlighted afterwards, and there is no moderation or pinning tooling. The app needs the basic message lifecycle — edit, delete, pin — with sensible permissions: everyone manages their own messages, the admin manages any message, and pinning is allowed in private chats for any participant and in channels only for the admin.

## What Changes

- **Edit messages**: a message can be opened in the composer in edit mode; after saving it is replaced for everyone, and the edited state is shown with an «изменено» indicator.
- **Delete messages**: a message is fully removed from history for all participants (no placeholder).
- **Pin messages**: a message can be pinned/unpinned; pinned messages show a pin badge, and the chat displays a pinned banner at the top that scrolls to the pinned message on click.
- **Context menu**: right-click on desktop and long-press on mobile open a context menu on a message with the actions available to the current user. On narrow screens the menu renders as a touch-friendly bottom sheet.
- **Permissions**: users can edit and delete only their own messages; the admin can edit and delete any user's message. Any participant can pin messages in a private chat; only the admin can pin in public channels.
- **Backend groundwork** (`project-js-chat-backend`): the server stamps authorship (`userId`) and lifecycle flags (`edited`, `pinned`, `createdAt`) on every message instead of trusting client-supplied fields; users get a `role` (`admin` | `user`); new authenticated socket events `editMessage`, `deleteMessage`, `pinMessage` enforce the permission rules server-side and broadcast `messageEdited`, `messageDeleted`, `messagePinned`.

## Capabilities

### New Capabilities

- `message-management`: editing, deleting and pinning of messages with the permission model (own vs admin, private chat vs channel) and the context-menu interaction on desktop and mobile.

### Modified Capabilities

- _(none — existing specs keep their behavior; the new lifecycle is additive.)_

## Impact

- **Backend** — `project-js-chat-backend/src/routes.js`: message authorship stamping and lifecycle flags on `newMessage`; `role` on seeded admin user and signup; three new socket event handlers with authorization and channel-scoped broadcasts; `publicProfile` exposes `role`. `GET /api/v1/data` already returns raw message objects, so new fields reach the frontend automatically.
- **Frontend** — `src/types.ts` (Message gains `userId`, `edited`, `pinned`; UserProfile gains `role`), `src/store/chat.ts` (update/remove/pin actions + pinned selector), `src/socket.ts` (listeners and emitters), `src/components/MessageContextMenu.tsx` + `src/components/PinnedMessageBanner.tsx` (new), `MessageList` (context menu trigger, long-press, badges), `MessageForm` (edit mode), `ChatPage` (wiring), `src/index.css` (menu, badges, banner, bottom sheet).
- **Dependencies** — none added; reuses existing socket/ack and modal patterns.