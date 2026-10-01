# Tasks

## 1. Group moderation: server-side target rules

- [x] 1.1 Replace `isModerationTarget` in `project-js-chat-backend/src/routes.js` with per-action guards: an owner may target any other member, an admin only a plain member, and nobody the owner. Verify each guard in isolation and confirm no existing caller still calls the old helper.
- [x] 1.2 Apply the new guards in `kickFromGroup` (owner), `muteGroupMember` and `unmuteGroupMember` (owner or admin). Verify by emitting each event as owner-on-member, owner-on-admin, admin-on-member, admin-on-admin and admin-on-owner: all five resolve as the D1 table requires, and every rejection comes back as an error acknowledgement with no state change.
- [x] 1.3 Verify `setGroupAdmin` accepts `admin: false` for an admin target and clears the id from `channel.admins`, and still rejects the owner. Verify with a real socket round-trip that the member list in the emitted `channelUpdated` reflects the new role.

## 2. Group moderation: client permissions and menu

- [x] 2.1 In `src/utils/permissions.ts`, replace `isModeratableTarget` with the per-action target rules, redefine `canActOnGroupMember` as "any action is available on this target", and add `canDemoteGroupMember`. Verify the full D1 matrix — every cell for member, admin and owner targets under both the owner and an admin viewer — returns the expected boolean.
- [x] 2.2 In `src/components/GroupMemberMenu.tsx`, add the «Забрать права администратора» item for an admin target and keep «Сделать администратором» for a member target. Verify by right-clicking a member row as owner (promote, mute, delete) and an admin row as owner (demote, mute, delete), and as an admin (mute only on a member row, no menu on an admin or the owner row).
- [x] 2.3 In `src/components/GroupInfoModal.tsx`, wire the demote item to `emitSetGroupAdmin(channel.id, memberId, false)`. Verify the role badge and the row's available menu change immediately after a successful demotion and that a rejected demotion surfaces the server's error through the existing error path.

## 3. Unread index in a single pass

- [x] 3.1 Add `buildUnreadIndex(messages, firstSeenAt, lastReadAtByChannel, myId)` to `src/store/unread.ts`, carrying over the `max(firstSeenAt, lastReadAt)` baseline and the self-authored skip from `countUnread`, and returning `{ count, lastUnreadAt }` per channel. Verify counts match the current `countUnread` for every channel on a fixture with mixed baselines, that the reader's own messages are excluded, that pre-`firstSeenAt` history is excluded, and that a null `firstSeenAt` yields zero counts.
- [x] 3.2 In `src/components/ChannelBar.tsx`, build the index once with `useMemo` over `[messages, firstSeenAt, lastReadAtByChannel, myId]`, pass each row's `count` down as a prop, and derive both tab totals by summing that index. Verify the badges and the tab totals agree for the same reader state, and remove `useChannelUnread` if `ChannelRow`, `DmRow` and `GroupRow` were its only callers.
- [x] 3.3 Confirm the row components no longer subscribe to `messages` directly and that one arriving message no longer costs a full scan per row. Verify with the React DevTools profiler or an equivalent render counter on a conversation list of 20+ channels.

## 4. Unread ordering of both tabs

- [x] 4.1 Add a comparator to `src/store/unread.ts` ordering by `count` descending, then by `lastUnreadAt` ascending, with a null timestamp sorting after every real one. Verify: larger count first; on equal counts the conversation whose newest unread message is older comes first; a conversation with a null `lastUnreadAt` sorts below one with a real timestamp at the same count; and a conversation with no unread messages sorts below every conversation that has any.
- [x] 4.2 Apply the comparator to the «каналы» list and to the «личные» list in `src/components/ChannelBar.tsx`, replacing the contacts-first sort. Verify both tabs render in unread-descending order, that «Поиск чатов» still filters the ordered list without reordering it, and that a non-contact with unread messages is no longer pushed below read contacts.
- [x] 4.3 Verify live reordering: with the sidebar open, receive messages in two different conversations and confirm the rows swap as the counts and their tie-breaks change, without a reload and without the active row moving out from under the pointer mid-interaction.

## 5. Verification

- [x] 5.1 Verify the production build and typecheck still pass (`npm run build`, and `npx tsc --noEmit` if the project has it) and that no new dependency appears in either `package.json`.
