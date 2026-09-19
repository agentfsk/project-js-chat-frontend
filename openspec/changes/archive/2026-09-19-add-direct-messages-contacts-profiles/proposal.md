# Proposal

## Why

The messenger only supports shared public channels and a fixed nickname chosen at signup. There is no way to find another user, talk to them privately, keep a contact list, or present an identity beyond a raw nick string. Adding private one-to-one messaging, user search with contact requests, and editable profiles (nickname + avatar) turns the app into a usable personal messenger.

## What Changes

- **User search**: searching by a full or partial nickname returns matching public profiles (id, nickname, avatar), excluding the current user.
- **Profiles**: every user has a profile (nickname + avatar). Other users' profiles can be opened from search results. The current user can edit their own profile: change the nickname (existing nick conflict rejected with 409, message history re-attributed to the new nick) and set/remove an avatar (upload restricted to images, served from the backend).
- **Contacts**: a profile has a "Добавить в контакты" action. Sending a request notifies the recipient in real time; the recipient sees a chat entry for the sender with a banner "Пользователь \<nickname\> хочет добавить вас в контакты" and accept (check) / decline (cross) buttons. The banner shows regardless of whether a chat already exists. Acceptance makes the contact mutual; contacts can be removed.
- **Direct messages**: one-to-one private channels between any two users, created from a found user's profile or from a contact. The sidebar gains two tabs — «личные» (contacts and DM chats) and «каналы» (existing shared channels).
- **Privacy (backend)**: socket connections must present a valid JWT (**BREAKING**). Events for private channels are delivered only to the two participants; public channel events keep broadcasting to everyone. `/api/v1/data` returns only the current user's accessible channels and messages, plus their profile, contacts, and pending requests (**BREAKING** payload change).

## Capabilities

### New Capabilities
- `profiles`: viewing other users' profiles and editing one's own profile (nickname change with history re-attribution, avatar set/remove).
- `contacts`: searching users by nickname, sending/accepting/declining contact requests, managing the contact list.
- `direct-messages`: one-to-one private channels with real-time delivery scoped to the two participants and the «личные» / «каналы» sidebar tabs.

### Modified Capabilities
- `chat`: message and channel events become scoped to channel participants (public channels to everyone, private channels to the two members); socket connections become authenticated; `/api/v1/data` is scoped to the current user.
- `user-auth`: the session identity is still the nickname, but the nickname becomes mutable — renamed nicknames keep history attribution and conflicting renames are rejected with 409.

## Impact

- **Backend** (`project-js-chat-backend`): state model (users gain `avatarUrl`/`contacts`, pending requests; channels gain `private`/`participants`), `plugin.js` (socket auth middleware + per-user rooms), `routes.js` (user search, profile update, avatar upload, contacts; scoped socket events; per-user `/data`), `uploads.js` (avatar storage and image validation).
- **Frontend** (`project-js-chat-frontend`): `types.ts`, new `api/users.ts` and `api/avatar.ts`, `api/data.ts`, `socket.ts` (auth token + new events), `store` (users/contacts store, chat store for private channels), `ChannelBar` tabs, profile viewer/editor modals, contact-request banner, search UI.