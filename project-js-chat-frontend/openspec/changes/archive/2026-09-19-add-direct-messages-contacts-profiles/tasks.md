# Tasks

## 1. Backend: socket auth and room routing

- [x] 1.1 Add socket.io auth middleware (validate `socket.handshake.auth.token` via `app.jwt.verify`, set `socket.userId`, join room `user:<id>`; reject without token) and verify a connection with no token is refused and with a valid token is accepted
- [x] 1.2 Route channel events by participants: public channels continue to broadcast via `app.io.emit`, private channels emit only to `user:<a>` and `user:<b>` rooms; verify a private-channel `newChannel`/`newMessage` is not received by a third socket

## 2. Backend: state model and scoped data

- [x] 2.1 Extend state: `user.avatarUrl` + `user.contacts: number[]`, global `contactRequests: [{id, fromUserId, toUserId, channelId, status: 'pending'}]`, `channel.private?` + `channel.participants?`; verify the seeded admin and existing channels still load in `/data`
- [x] 2.2 Scope `GET /api/v1/data` per user (public channels + own private channels, their messages, `me`, `contacts` as profiles, incoming pending requests); verify a second user does not see the first user's private channels in `/data`
- [x] 2.3 Add idempotent private-channel creation (find-or-reuse by unordered participant pair, `private: true`, `removable: false`, name = peer nickname); verify creating twice returns the same channel id

## 3. Backend: profiles, avatars, search

- [x] 3.1 Add `GET /api/v1/users/search?query=` returning public profiles `{id, username, avatarUrl}` excluding self (case-insensitive substring match, no email leakage); verify searching partial nick returns matches and self is absent
- [x] 3.2 Add `PATCH /api/v1/users/me` accepting `{username?, avatarUrl?}`, rejecting a taken nickname with 409, rewriting message-history usernames and own DM-channel names on rename, broadcasting `userUpdated`; verify rename updates history and conflict returns 409
- [x] 3.3 Add `POST /api/v1/avatars` accepting only image mime types up to 1 MB and returning `{ url }`; verify a PNG upload succeeds, a text file is rejected, and `avatarUrl: null` clears the avatar

## 4. Backend: contacts

- [x] 4.1 Add `POST /api/v1/contacts {userId}` that creates/accepts the pair DM channel, records a pending request, and pushes `contactRequest` to the recipient; verify the recipient socket receives the event and the pair has exactly one channel and one request
- [x] 4.2 Add request resolution (`accept`/`decline`) mutating `contacts` mutually, deleting the pending request, and pushing `contactRequestResolved` to the sender; verify accepted contacts appear for both users and declined requests leave the chat in place and allow re-sending
- [x] 4.3 Add `DELETE /api/v1/contacts/:userId` removing a contact and pushing `contactRemoved`; verify the contact disappears from both sides

## 5. Frontend: types, api, store

- [x] 5.1 Extend `src/types.ts` with `UserProfile`, `ContactRequest`, `Channel.private?`/`participants?` and update `DataResponse`; verify `tsc -b` passes
- [x] 5.2 Add `src/api/users.ts` (search, profile update, avatar upload, contact request/resolve/remove) and wire through `api/client.ts` bearer handling; verify each function returns expected payloads via the dev proxy
- [x] 5.3 Update `src/socket.ts` to send the token in `socket.auth`, handle `connect_error` on rejected auth (clear session), and add handlers for `contactRequest`, `contactRequestResolved`, `contactRemoved`, `userUpdated`; verify a rejected-token connection returns to login
- [x] 5.4 Add `useUsersStore` (me, contacts, pending requests, applyUserUpdate) and extend `useChatStore` (accept private channels, rewrite message usernames on `userUpdated`); verify stores update state correctly under emitted events

## 6. Frontend: UI

- [x] 6.1 Refactor `ChannelBar` into «личные» / «каналы» tabs, listing private chats (peer nickname + avatar) under «личные» with a search entry point; verify tabs switch lists and DM rows label by peer nick/avatar
- [x] 6.2 Add a search results view and `ProfileModal` for another user showing avatar/nickname with «Написать» and «Добавить в контакты» (state-aware: sent / already contact); verify search opens a profile and actions are wired to API
- [x] 6.3 Add the contact-request banner above a DM chat ("Пользователь \<nick\> хочет добавить вас в контакты") with accept/decline; verify it appears over both new and pre-existing chats and disappears after accepting or declining
- [x] 6.4 Add the own-profile editor (avatar preview + upload/remove, nickname field, conflict error from 409); verify saving updates the header avatar/nick and history renames via `userUpdated`
- [x] 6.5 Add a reusable `Avatar` component (image or initial placeholder) and use it in DM rows, profiles, and the chat header; verify placeholder renders when avatar is null

## 7. Integration verification

- [x] 7.1 End-to-end with two browser users: A searches B by nick, opens profile, sends contact request; B sees the chat + banner, accepts; A and B both show the contact, exchange private messages delivered only to the pair; verify public channels still work and A renaming reflects on B's list and history (verified scripted over HTTP + socket at the protocol level: search → request → accept → mutual contacts → private delivery isolated from a third socket → rename rewrite of history/DM titles → public channel create/rename/remove)
- [x] 7.2 Verify lint and build pass on both repos (frontend: `npm run lint` + `npm run build`; backend: eslint via `make` or `pnpm exec eslint src`)