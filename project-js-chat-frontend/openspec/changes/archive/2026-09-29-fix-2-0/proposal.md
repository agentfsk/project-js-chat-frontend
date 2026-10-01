# Proposal

## Why

Group moderation is currently one-sided: the owner can promote a member to admin but has no way to reverse it, and the row of another admin offers no menu at all, so an owner or admin who becomes abusive can only be handled by deleting and recreating the group. Separately, the sidebar does not surface what the reader missed — conversations keep their creation order no matter how much unread activity they hold, and the counts are recomputed by scanning every message once per sidebar row.

## What Changes

- The owner gains full moderation over other admins: the member row of an admin opens a menu that offers «Забрать права администратора» instead of «Сделать администратором», plus «Удалить» and «Заглушить».
- Demotion uses the existing `setGroupAdmin` server command with `admin: false`; the client gains a dedicated `canDemoteGroupMember` predicate and a «Забрать права администратора» menu item.
- The server's moderation guard is split per action so the owner may mute, demote and remove admins, while an admin's authority stays limited to muting plain members; the owner is never a valid target.
- Admins keep a menu on plain members containing only «Заглушить» / «Вернуть голос», and a regular member still gets no menu.
- The sidebar sorts each tab by unread count descending. On equal counts the conversation whose newest unread message is older comes first — the one that reached its current count earlier.
- Unread counts for all conversations are computed in a single pass over the message list into a `count` + `lastUnreadAt` index, replacing the per-row full scan, and both sidebar tabs and the row badges read from that one index.

## Capabilities

### New Capabilities

None.

### Modified Capabilities
- `groups`: the role hierarchy gains demotion and lets the owner moderate admins; muting a member is no longer refused for admins when the owner asks for it.
- `unread-indicators`: conversations are ordered by unread count in both sidebar tabs, with a defined tie-break.

## Impact

- Frontend `src/utils/permissions.ts`: split the single `isModeratableTarget` guard into per-action target rules; add `canDemoteGroupMember`.
- Frontend `src/components/GroupMemberMenu.tsx`, `GroupInfoModal.tsx`: open the menu on an admin row for the owner and offer the demote item.
- Frontend `src/store/unread.ts`, `src/components/ChannelBar.tsx`: `buildUnreadIndex` plus unread-descending ordering of both tabs.
- Backend `project-js-chat-backend/src/routes.js`: per-action moderation guards in `kickFromGroup`, `muteGroupMember`, `unmuteGroupMember`.
- Not in scope: the stale-`isMuted` state after a mute expires is left as is; the `newMessage` broadcast still embeds the full channel object for group channels; no tests are added, as the project has no test runner.
- Sequencing: `groups` is introduced by the still-unarchived `chats-1-0`, so this change must be archived after it. Separately, `chats-1-0`'s group-creation requirement still demands at least one member while the server and the create dialog accept an empty member list — that drift belongs to `chats-1-0` and is not fixed here.
