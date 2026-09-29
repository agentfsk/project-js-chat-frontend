# Design

## Context

See proposal.md — Why.

Relevant current state:

- `src/utils/permissions.ts` has a single private helper `isModeratableTarget` that means "plain member": participant, not the owner, not an admin. It is used by `canMuteGroupMember` and `canActOnGroupMember`. `canSetGroupAdmin` and `canKickFromGroup` do not use it and already allow any non-owner target, so the three predicates disagree with each other. `setGroupAdmin` on the server already supports `admin: false`, so demotion needs no new server command.
- The backend mirrors the same single `isModerationTarget` helper and applies it to `kickFromGroup`, `muteGroupMember` and `unmuteGroupMember` — which is why the owner cannot act on an admin even if the client offered the item.
- `ChannelBar` renders each row as a child component that calls `useChannelUnread(channel.id, myId)`, and each of those hooks subscribes to the whole `messages` array and rescans it. Tab totals add a further full scan per channel in `sumUnread`.
- The «личные» tab currently sorts contacts-first, which is orthogonal to unread and does not touch the «каналы» tab at all.
- The repo has no test runner and no test dependencies, so the moderation matrix and the ordering tie-break are verified by hand during implementation.

## Goals / Non-Goals

**Goals:**
- One authority per moderation action, expressed once per side, so the client menu and the server guard cannot drift.
- Unread counts computed in one pass, with a tie-break that answers "which conversation reached this count earlier".

**Non-Goals:**
- Not a permissions redesign: the owner/admin/member hierarchy and its server enforcement stay as they are.
- Not a real-time reorder animation or sticky ordering across tab switches; the order is derived, not stored.
- The stale-`isMuted` flag after expiry stays untouched.
- The `newMessage` broadcast keeps embedding the channel object for group channels; slimming that payload is separate work.
- No test infrastructure is added.

## Decisions

**D1 — Replace the one `isModeratableTarget` guard with a set of per-action target predicates.**

Instead of one shared "is a plain member" test, each capability gets its own target rule, keyed on the viewer's role:

| target | owner | admin |
|---|---|---|
| member | promote, demote\*, mute, kick | mute |
| admin | demote, mute, kick | — |
| owner | — | — |

An admin target is still a member of the group, so a single `isMember(channel, targetId)` plus a `isAdminTarget` branch covers it. This is chosen over "make `isModerableTarget` mean any non-owner" because that single widening would hand admins kick and mute rights over other admins, which is exactly the constraint that keeps the current bug safe on the server.

**D2 — Client menu is rendered from the same predicates the server enforces.**

`GroupMemberMenu` keeps deriving its items from `permissions.ts` rather than branching on `isGroupOwner` inline, and `GroupInfoModal`'s open gate becomes `canActOnGroupMember`, which is redefined as "any action available on this target" rather than "target is a plain member". A new `canDemoteGroupMember` covers demotion; the promote item stays hidden when the target is already an admin, and the menu shows «Забрать права администратора» in its place. Alternative considered: server-driven capabilities on the channel object. Rejected — the client already has the full member list and roles, and it would add a field the rest of the app does not use.

**D3 — Demotion reuses `setGroupAdmin` with `admin: false`.**

The server handler already clears the id from `admins` when `admin` is falsy, so no backend change is needed for the action itself. The server change is limited to the target guard, which currently rejects only the owner and so already permits admins.

**D4 — Unread ordering: `count desc`, then newest unread message ascending.**

"Reached this count earlier" is read as *the moment the conversation's current count was completed*, which is the `createdAt` of its newest unread message. A conversation that hit 3 an hour ago therefore sits above one that hit 3 a minute ago. Sorting by the newest unread message descending — the more common "recent first" instinct — would show the opposite of what was asked for.

Null `createdAt` (the case `countUnread` already treats as unparseable) sorts after every real timestamp, so a conversation whose newest unread message has no timestamp sits at the bottom of its count group rather than the top.

The current contacts-first ordering of the «личные» tab is dropped: it is a separate axis and keeping both means a non-contact with unread mail still sinks below read contacts. The pre-existing ordering is not covered by any scenario in `unread-indicators` or `direct-messages`, so removing it changes no specified behaviour.

**D5 — `buildUnreadIndex` returns `count` plus `lastUnreadAt` per channel, computed once in `ChannelBar`.**

Signature along the lines of `buildUnreadIndex(messages, firstSeenAt, lastReadAtByChannel, myId)` → `Record<number, { count: number; lastUnreadAt: number | null }>`.

The baseline rule is the existing one: `max(firstSeenAt, lastReadAt[channelId])`, and the reader's own messages are skipped — both move over unchanged from `countUnread`, so counts do not shift as a side effect of the refactor. The per-channel baseline is resolved from the record at the time a message is visited, which is why the map is built in one pass rather than grouped by channel first.

`ChannelBar` builds the index once with `useMemo` over `[messages, firstSeenAt, lastReadAtByChannel, myId]`, sorts both tab lists by it, and passes each row's `count` down as a prop. The row components stop calling `useChannelUnread`; that hook and the per-row subscription go away. What this buys is the scan, not the render count: `ChannelBar` subscribed to `messages` before as well, so the rows re-rendered on a new message then too, and they still re-render now as its children. The saving is the N rescans of the whole message list, replaced by one pass. Cutting the row renders too would mean `React.memo` on the three row components, which is outside this change. Tab totals sum the same index, which is what makes the badges and the totals agree by construction.

`useChannelUnread` is kept only if another caller needs it; if the row components were the only callers it is deleted. Alternative considered: keeping the per-row hook and adding a memo cache. Rejected — the hook's cost is the subscription, not the memo, so caching inside it leaves the re-render storm in place.

**D6 — The two sides keep separate copies of the target rules.**

`permissions.ts` and `routes.js` each hold their own guard rather than sharing a module: sharing would mean a new build step or a cross-repo dependency for two small predicates. The two copies are pinned together by the scenarios in `specs/groups/spec.md` and by the manual matrix walk in tasks 1.2 and 2.1.

## Risks / Trade-offs

- **A target guard is widened on the server and the UI is not updated in the same deploy** → the socket is a single process here, so the client and server ship together; the menu is still driven by client predicates, and a stale client can only ever be refused, never silently granted an action it does not offer.
- **`lastUnreadAt` is a heuristic for "reached this count earlier"** → it is exactly that moment for a monotonically growing count, and it is stable, unlike a first-unread timestamp, which changes as the reader reads and reorders rows under the cursor. If a user prefers "oldest unread", that is a comparator change in one function, not a data-model change.
- **The index is recomputed on every message** → it is O(M) once per message arrival instead of O((C+2)·M) per render, so the change is a strict improvement at any size; the remaining cost is the `useMemo` recomputing on every new message, which the O(M) pass absorbs.
- **Dropping contacts-first ordering** → a non-contact with unread messages now rises above read contacts. Intended, and unobservable against the current specs, but it is a visible change for users who relied on the contact grouping.
- **Duplicated guards with no automated coverage** → the moderation matrix and the D4 tie-break are checked by hand, so a later edit to one side can drift from the other silently. The scenarios in `specs/groups/spec.md` are the written reference for that check.
- **`groups` is not yet in `openspec/specs/`** → this change must be archived after `chats-1-0`, otherwise the delta has no base capability to modify.
