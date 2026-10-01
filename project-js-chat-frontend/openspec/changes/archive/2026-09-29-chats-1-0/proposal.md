# Proposal

## Why

The messenger supports one-to-one private chats and broadcast channels, but has no way to run a persistent multi-user conversation with its own identity — and the search in the «личные» tab reaches into the whole user directory instead of the reader's own chats. Groups add Telegram-style multi-user chat rooms with roles and moderation, and the search rework makes the tab about finding the conversation that is already there.

## What Changes

- Introduce a new channel kind `group` with its own identity (name, description, avatar), a membership list, an owning user, and a moderation model of `owner`/`admin`/`member`.
- Group creation flow: a «+» button above the «личные» search opens a popover with «Найти друзей» and «Создать группу»; the create-group dialog takes a name, description, optional avatar, and members drawn only from the creator's contacts.
- Groups appear in the «личные» tab alongside direct chats, with their own avatar row, unread count, and a «…» menu opening the group's info: description, avatar, name, and member list. The owner additionally gets «Пригласить друзей», «Изменить группу», and a red «Удалить группу».
- Group moderation: the owner can promote members to admin, mute a member for a fixed duration (1/2/5/12/24 hours and 3 days), and remove a member (with confirmation). Admins can mute members but cannot promote, remove, or act on other admins or the owner.
- Muting is enforced by the server: a muted member cannot send messages in the group until the duration expires; the composer shows «Вы заглушены в этой группе на… осталось HH:MM:SS» with a live countdown.
- Deleting a group requires two confirmations: a «Да / Нет» prompt followed by typing the word `Yes`.
- Groups reuse the existing message features — send, edit, delete, reactions, attachments, GIF, emoji. Calls and message pinning are **not** offered in groups.
- Search rework in the «личные» tab: the default search filters the reader's own chats (direct messages and groups) by name with placeholder «Поиск чатов»; «Найти друзей» switches to server-side user search with placeholder «Поиск пользователей».
- Mobile: member actions open by long-press instead of right-click, reusing the messenger's existing long-press pattern.

## Capabilities

### New Capabilities
- `groups`: the group chat model — creation, membership restricted to contacts, real-time delivery to members, group info menu, role hierarchy (owner/admin/member), server-enforced muting with durations and countdown, member removal, invite, group editing, two-step group deletion, and mobile long-press member actions.

### Modified Capabilities
- `direct-messages`: the «личные» tab now lists groups alongside direct chats, and its search filters the reader's own chats (direct and group) by conversation name while a «+» popover provides user search and group creation entry points.
- `unread-indicators`: unread counts appear on group rows, and the «личные» tab total includes group chats.
- `message-management`: message pinning is not offered in group chats.

## Impact

- Backend `project-js-chat-backend/src/routes.js`: a `kind` discriminator on channels (`public`/`direct`/`group`, so the two-person DM lookup stops matching groups), group creation/edit/removal/invite/kick/role/mute socket events, contact-only membership validation, mute enforcement inside `newMessage`, and `muted[]` state per group.
- Frontend: `src/types.ts`, `src/store/chat.ts`, `src/socket.ts`, `src/utils/permissions.ts`, `src/components/ChannelBar.tsx`, `ChatPage.tsx`, `MessageForm.tsx`; new components for group creation, group info, and the member context menu; `src/index.css`.
- No new dependencies; reuses the existing avatar upload endpoint (`/api/v1/avatars`) for group avatars.