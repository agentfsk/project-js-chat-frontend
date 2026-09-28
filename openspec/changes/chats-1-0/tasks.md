# Tasks

## 1. Backend — channel `kind` discriminator

- [x] 1.1 Add `channelKind(ch)` (falls back to `private ? 'direct' : 'public'`), `isGroup(ch)`, update `isPrivateChannel` to `['direct','group']`, and change `findPrivateChannel` to require `kind === 'direct'` in `project-js-chat-backend/src/routes.js`; verify a DM lookup never returns a group by creating two channels and checking `findPrivateChannel` resolves only the DM
- [x] 1.2 Stamp `kind: 'direct'` in `getOrCreatePrivateChannel` and `kind: 'public'` in the new-channel handler, and restrict `callOffer`/call events to `kind === 'direct'` with `calleeId` derived as the single other participant; verify `pnpm exec eslint src` passes and a call initiated in a group is rejected
- [x] 1.3 Confirm no existing helper relies on `private` alone for access decisions (audit `hasAccess`, `emitToChannel`, `isPublicChannel`) so groups get member-only access; verify `hasAccess` treats `kind === 'group'` as participant-scoped

## 2. Backend — group model and authorization

- [x] 2.1 Define group channel shape `{ kind:'group', name, description, avatarUrl, ownerId, admins:[], muted:[{userId,mutedUntil}], participants:[] }` in `routes.js` and include it in `/api/v1/data` output for members; verify a group channel appears in the member's `/api/v1/data` response and is absent from non-members'
- [x] 2.2 Add server-side role helpers `isOwner`, `isAdmin`, `canModerate`, `canTarget` (target not owner/admin) and an `ack(io, socket, event, err)` error convention so command events answer errors consistently; verify each helper with an eslint-passing unit check and confirm wrong who-calls return errors
- [x] 2.3 Reuse `/api/v1/avatars` upload for group avatars (no new endpoint); verify an avatar upload returns a URL that can be stored on the group channel

## 3. Backend — group command events

- [x] 3.1 Implement `createGroup` (validates members are the creator's contacts, stamps owner) on the socket `connection` handler; verify creating with a contact succeeds, creating with a non-contact is rejected, and a `channelUpdated {channel}` is acknowledged to the members
- [x] 3.2 Implement `editGroup` (name/description/avatarUrl) and `removeGroup` (owner-only, broadcasts then deletes); verify non-owner edits/deletes are rejected and the two-step client delete is backed by a single owner `removeGroup` call
- [x] 3.3 Implement `inviteToGroup` (owner-only, contacts-only) and `kickFromGroup` (owner-only, not on owner) with a direct `channelRemoved` to the kicked user's sockets; verify members receive `channelUpdated`, the kicked user loses the channel on reload without re-fetch, and the kicked user gets `channelRemoved`
- [x] 3.4 Implement `setGroupAdmin {admin: true|false}` (owner-only, not on owner), `muteGroupMember {userId, until}` (moderator, target is plain member, records ISO), and `unmuteGroupMember`; verify each emits `channelUpdated` and rejects wrong callers

## 4. Backend — server-enforced mute

- [x] 4.1 Add the mute gate in `newMessage`: for `kind === 'group'`, reject with an error ack when `muted` holds the sender with `mutedUntil > now`; verify `pnpm exec eslint src` passes and a muted member's send attempt returns an error ack without side effects in state

## 5. Frontend — types, store, socket

- [x] 5.1 Extend `Channel` in `src/types.ts` with `kind`, `description?`, `avatarUrl?`, `ownerId?`, `admins?`, `muted?: {userId, mutedUntil}[]`; verify `npm run build` passes
- [x] 5.2 Add `updateChannel(channel)` reducer (replace by id) to `src/store/chat.ts` and wire `channelUpdated` and `channelRemoved` in `src/socket.ts` alongside existing handlers; verify `npm run build` and `npm run lint` pass and a fresh `muted` value on a channel replaces the old one
- [x] 5.3 Add a `useChannelMute(me)` selector that returns the caller's `muted` entry for the active group; verify a muted member's selector returns the ISO `until` and an unmuted member's returns undefined

## 6. Frontend — permissions

- [x] 6.1 Implement `isGroupOwner`, `isGroupAdmin`, `canModerateGroup`, `canMuteGroupMember`, `canSetGroupAdmin`, `canKickFromGroup` in `src/utils/permissions.ts` and make `canPinMessage` return false for `kind === 'group'`; verify `npm run lint`/`build` pass and unit-check each predicate against owner/admin/member combos

## 7. Frontend — group conversation page

- [x] 7.1 In `src/pages/ChatPage.tsx` render group header (avatar, name, description) without peer/contact logic, show `CallButtons` only for `kind === 'direct'`, and never show the pinned banner for groups; verify in the browser that a group header shows and call/pin affordances are absent
- [x] 7.2 Reuse existing bubble behavior so send/edit/delete/reactions/attachments/GIF/emoji work inside groups unchanged; verify in the browser each action behaves identically to a DM

## 8. Frontend — «личные» list, «…» menu, search rework

- [x] 8.1 Render group rows in the «личные» tab of `src/components/ChannelBar.tsx` (avatar/placeholder + name + `UnreadBadge` + «…») sorted with DMs, with unread counts from `src/store/unread.ts`; verify groups and DMs share the tab and opening a group clears its unread
- [x] 8.2 Implement the default search mode: filter the «личные» list client-side by DM peer name or group name, placeholder «Поиск чатов», empty state; verify typing narrows without network requests and «Поиск чатов» is shown
- [x] 8.3 Add the «+» action above the search row opening a popover with «Найти друзей» and «Создать группу»; «Найти друзей» flips the input to user search (placeholder «Поиск пользователей», existing `searchUsers` flow) with a control to return to chat mode; verify both popover items switch/search and the mode returns to «Поиск чатов»
- [x] 8.4 Implement the group «…» menu (info: avatar, name, description, member list) with owner-only «Пригласить друзей», «Изменить группу», red «Удалить группу»; verify a member sees info only and the owner sees the owner actions

## 9. Frontend — group creation and editing

- [x] 9.1 Build `CreateGroupModal` (name, description, avatar via `uploadAvatar`, contact multi-select using `src/store/users.ts` contacts) emitting `createGroup`; verify browser creation with a name + ≥1 contact succeeds, a contact-only picker is shown, and unnamed confirm shows an error
- [x] 9.2 Build edit flow reusing the create dialog for name/description/avatar emitting `editGroup`; verify edits propagate to all tabs without a reload

## 10. Frontend — invitations, kick, deletion

- [x] 10.1 Implement «Пригласить друзей» dialog (contacts-only, `inviteToGroup`) and the kick confirmation «Вы уверены, что хотите удалить данного пользователя? (Да/Нет)» calling `kickFromGroup`; verify invite adds the member for all and kick removes the target immediately
- [x] 10.2 Implement group deletion with two dialogs: «Да/Нет», then a typed-confirmation dialog requiring exactly `Yes` calling `removeGroup`; verify «Нет»/no-`Yes` aborts, `Yes` deletes for all members, and non-owner attempts fail

## 11. Frontend — member moderation menu and mute

- [x] 11.1 Build `GroupMemberMenu` (positioning/scroll-dismiss pattern from `MessageContextMenu`) with role-gated actions per spec: owner sees «Сделать администратором», «Заглушить», «Удалить»; admin sees only mute; no menu on other admins/owner or for plain members; verify each combination in the browser
- [x] 11.2 Implement the «Заглушить» duration submenu (1ч/2ч/5ч/12ч/24ч/3 дня, red text, `muteGroupMember`) and «Вернуть голос» for already-muted targets (`unmuteGroupMember`); verify durations disable sends and restore-voice re-enables immediately
- [x] 11.3 Add the muted-composer banner in `src/components/MessageForm.tsx` reading the active user's mute with a live HH:MM:SS countdown that auto-re-enables the composer on expiry; verify the disabled composer shows the banner while muted and returns at expiry

## 12. Frontend — mobile member actions

- [x] 12.1 Wire long-press (per the `LONG_PRESS_MS`/move-tolerance pattern in `MessageList`) on member rows to open `GroupMemberMenu` on touchscreens, suppressing the native context menu; verify in browser devtools device emulation that long-press opens the menu, a scroll doesn't trigger it, and shake/native menu is suppressed

## 13. Integration verification

- [ ] 13.1 Manual end-to-end pass (frontend `npm run lint` + `npm run build`, backend `pnpm exec eslint src`): create a group from a second /api/v1 account, exchange messages, promote admin, mute a third user for 1 hour and confirm server blocks their sends + composer shows the countdown, invite, kick (target loses the row), edit, and delete group via typed `Yes` — all tabs in sync without reloads