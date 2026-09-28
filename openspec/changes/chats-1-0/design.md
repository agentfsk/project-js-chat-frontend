# Design

## Context

Groups are a new conversation kind with a real owner, member roles, and moderation. Two structural facts shape the design:

1. The backend treats a private channel as a two-person pair everywhere `findPrivateChannel` / `getOrCreatePrivateChannel` and `callOffer` run. A group must not be a match for those lookups, or creating a DM can reopen a group (order-dependent bug, worse than a stable one).
2. Delivery and access (`hasAccess`, `emitToChannel`) already iterate `participants` correctly for any member count, so a group implemented as a participant-scoped channel inherits real-time delivery and unread/read accounting for free.

The backend repo (`project-js-chat-backend`) has no OpenSpec root; its changes are described here as system behavior in the spec deltas and implemented in `routes.js`.

## Goals / Non-Goals

**Goals:**
- A `kind` discriminator that cleanly separates `public` / `direct` / `group` channels, so DM lookups can never resolve to a group.
- Groups as first-class channels: listed in «личные», with unread counts, standard message features (send/edit/delete/reactions/attachments/GIF/emoji), real-time delivery to members only.
- Server-authoritative moderation: role checks and mute enforcement in the backend, client menus reflecting the same rules.
- Search modes in «личные»: default own-chat filter, switchable to user-directory search via the «+» popover.
- Mobile: member actions via long-press, matching the existing message long-press pattern.

**Non-Goals:**
- Group audio/video calls (spec'd as not offered; the existing `callOffer` guard moves to `kind === 'direct'`).
- Group message pinning (spec'd as not offered).
- Leaving a group voluntarily; groups are removed only by the owner. Not requested.
- Persistence beyond the backend's existing in-memory state.

## Decisions

### D1. `kind` discriminator on the channel
Add `kind: 'public' | 'direct' | 'group'` to the channel model. Helpers change:

```js
const channelKind = (ch) => ch.kind ?? (ch.private ? 'direct' : 'public');
const isGroup = (ch) => channelKind(ch) === 'group';
const isPrivateChannel = (ch) => ['direct', 'group'].includes(channelKind(ch));
const findPrivateChannel = (state, a, b) => state.channels.find(
  (ch) => channelKind(ch) === 'direct'
    && ch.participants.includes(a) && ch.participants.includes(b),
);
```

`getOrCreatePrivateChannel` stamps `kind: 'direct'`; `newChannel` stamps `kind: 'public'`; `createGroup` stamps `kind: 'group'`. Falling back to `(private ? 'direct' : 'public')` keeps any legacy in-memory channel correct without a data migration. **Alternative rejected:** inferring groupness from `participants.length > 2` — a 2-member group would break everything and invite a silent DM/group collision.

### D2. Group state lives on the channel object
Group metadata is fields on the channel:

```js
{ kind: 'group', name, description, avatarUrl, ownerId, admins: [], muted: [], participants: [] }
// muted: [{ userId, mutedUntil: ISO }]
```

Goals-by-elimination: `/api/v1/data` returns `state.channels.filter(hasAccess)` today, so group metadata reaches the client on the existing data path; unread/read state key on `channelId` and work unchanged; `emitToChannel` handles delivery. No second array, no extra endpoint.

### D3. Command events with ack + one broadcast event
Client action → ack socket event; server responds to members with a single `channelUpdated` carrying the full channel. The frontend store needs only `updateChannel` (replace by id) plus existing `addChannel`/`removeChannel`/`addMessage`.

| Action | Command event | Granted to |
|---|---|---|
| Create | `createGroup {name, description, avatarUrl, memberIds}` | any user; members validated as the creator's contacts |
| Edit | `editGroup {channelId, name?, description?, avatarUrl?}` | owner |
| Delete | `removeGroup {channelId}` | owner |
| Invite | `inviteToGroup {channelId, memberIds}` | owner; contacts only |
| Kick | `kickFromGroup {channelId, userId}` | owner (not on owner) |
| Promote | `setGroupAdmin {channelId, userId, admin}` | owner (not on owner) |
| Mute | `muteGroupMember {channelId, userId, until}` | owner or admin; target not owner/admin |
| Unmute | `unmuteGroupMember {channelId, userId}` | owner or admin; same rule |

On success each emits `channelUpdated {channel}` to the channel. Kick additionally emits a removal signal to the removed user only, so their «личные» row disappears (they are not in the channel room anymore to receive `channelUpdated`). Delete emits to all participants before removal. **Alternative rejected:** a distinct broadcast event per mutation — eight new handlers and eight store reducers for one state shape; replace-by-id is idempotent and cheap.

### D4. Server-authoritative mute
`newMessage` already checks `hasAccess`. Inside, before storing, when `channelKind(channel) === 'group'`:

```js
const mute = channel.muted.find((m) => m.userId === socket.userId);
if (mute && new Date(mute.mutedUntil) > new Date()) {
  acknowledge({ status: 'error', message: 'Вы заглушены в этой группе.' }); return;
}
```

Chat spec's existing delivery rules (REST of `chat` requirement "Authenticated real-time connections") already scope events to participants; group delivery is the same path. **Rationale:** the spec requires the server to block the muted member — a client-side disable is cosmetic and trivially bypassed.

### D5. Calls stay two-person only
`callOffer` changes its guard from `isPrivateChannel` to `channelKind(channel) === 'direct'` and derives `calleeId` as the single other participant. `ChatPage` renders `CallButtons` only for `kind === 'direct'`.

### D6. Frontend permissions live in `src/utils/permissions.ts`
Add group-aware predicates mirroring the server rules so menus never offer what the server rejects:

```ts
isGroupOwner(channel, me)         // me.id === channel.ownerId
isGroupAdmin(channel, me)         // channel.admins includes me
canModerateGroup(channel, me)     // owner || admin
canMuteTarget(channel, me, target)  // canModerate && target is plain member
canSetGroupAdmin(c, me, t)          // owner && target !== owner
canKickFromGroup(c, me, t)          // owner && target !== owner
canPinMessage(channel, me)          // now: !channel.kind === 'group' && existing rule
```

Server still enforces every rule; the client predicates gate the menu only.

### D7. Composer mute banner in `MessageForm`
`MessageForm` reads the active channel's `muted[]` for the signed-in user. While muted it renders a disabled composer with «Вы заглушены в этой группе на … осталось HH:MM:SS», updating via a 1-second interval backed by `mutedUntil`; at expiry the banner clears and the composer re-enables automatically. The server remains the source of truth — the banner is presentation.

### D8. New components and the search rework
- `CreateGroupModal` — name, description, avatar upload (`uploadAvatar` → URL), contact multi-select; submits `createGroup`.
- `GroupInfoModal` — avatar, name, description, member list; owner-only footer actions «Пригласить друзей» / «Изменить группу» / «Удалить группу»; edit reopens the create/edit dialog with the same fields.
- `GroupMemberMenu` — positioned context menu on a member row (right-click and long-press), reusing the `MessageContextMenu` positioning/scroll-dismiss pattern; owner/admin action lists from D6. «Заглушить» expands a mute-duration submenu (1/2/5/12/24 h, 3 days — red text); muted members show «Вернуть голос».
- Confirmations: remove-member «Да / Нет»; group delete is «Да / Нет» then a typed `Yes` dialog.
- `ChannelBar`: the «+» sits in the «личные» head row; popover with «Найти друзей» / «Создать группу». Default search mode filters `privateChannels` + `groupChannels` client-side by name with placeholder «Поиск чатов»; «Найти друзей» flips the same input to the existing `searchUsers` flow (placeholder «Поиск пользователей») with a clear/close control to return to chat mode.

Group rows sort into the «личные» tab with the same `DmRow` visual language (avatar + name + `UnreadBadge` + «…»), skipping the peer/contact logic that only applies to DMs.

### D9. Mobile member actions
Long-press on a member row opens `GroupMemberMenu`, using the message long-press pattern (`LONG_PRESS_MS`/move tolerance in `MessageList`) so it works without a mouse and does not conflict with row scroll. The native context menu is suppressed on browsers where it appears.

## Risks / Trade-offs

- **Backend has no OpenSpec root** → Its group changes are system-level requirements in this repo's deltas and implemented in the sibling repo. If the backend gains OpenSpec later, these deltas migrate there. Mitigation: keep the spec language system-level (it already is) so no delta is frontend-specific.
- **Full-channel `channelUpdated` for every mutation** → Higher payload than minimal deltas, but channel objects are small and the volume is low (user actions only). Idempotent replace-by-id makes missed/duplicated broadcasts harmless.
- **In-memory backend state** → Groups, roles and mutes vanish on restart, consistent with existing messages/calls. Mute enforcement and countdown still behave on live state; after a restart the server rejects nothing, which is the same consistency the whole app already has.
- **Mute/countdown clock skew** → Server compares `mutedUntil` against server time; the client countdown uses the same ISO and expires itself. A wrong client clock only delays cosmetic re-enable, never bypasses the check.
- **Kick/delete delivery to the removed user** → The removed user is removed from `participants` before the broadcast, so a dedicated per-user signal is required or their row lingers until reload. Mitigation: emit a direct `channelRemoved` to the removed user's socket(s).
- **Admin cannot target owner/other admins** → Enforced on both sides (D4/D6); mismatch between client menu and server would surface as a silent rejection, so both lists are derived from one `channel` object in scope.

## Migration Plan

No deployed persistence — the backend rebuilds state per process start. Deployment is: ship backend + frontend together, restart backend. Legacy channels (public + existing DMs) continue to resolve via the `kind` fallback in D1. Rollback: revert both repos; since nothing is persisted, a restart restores the prior model. No data migration required.

## Open Questions

None that change specs, approach, or tasks. Minor copy (exact duration labels, `Yes` casing) is settled in implementation.