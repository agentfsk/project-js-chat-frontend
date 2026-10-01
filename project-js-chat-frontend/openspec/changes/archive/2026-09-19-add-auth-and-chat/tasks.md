# Tasks

## 1. Dependencies

- [x] 1.1 Install `socket.io-client` and `zustand` via `pnpm add socket.io-client zustand` and verify `pnpm install` completes and both resolve in `package.json`
- [x] 1.2 Run `pnpm lint` and `pnpm build` on the untouched app and verify both pass as a baseline

## 2. Auth layer

- [x] 2.1 Create the `auth` zustand store (token, username, `setSession`, `clear`) reading the token from `localStorage` on init, and verify the store reads back a token placed in localStorage
- [x] 2.2 Create the `src/api/` fetch wrapper that attaches `Authorization: Bearer <token>`, parses JSON, and on a 401 response clears the auth store, and verify it posts `{ username, password }` to `/api/v1/login` and `/api/v1/signup` with the proxy
- [x] 2.3 Implement auth API calls, and verify that a valid login returns `{ token, username }` and an invalid login rejects with a 401 that the caller can surface

## 3. Login screen

- [x] 3.1 Build `LoginPage` with a login/signup toggle and forms for username and password, and verify both forms render and switch correctly
- [x] 3.2 Wire submit to the login and signup API calls, and verify on success the token lands in localStorage and the username is stored
- [x] 3.3 Show inline errors (401 wrong credentials, 409 duplicate username), and verify each error text appears without leaving the form

## 4. App gate

- [x] 4.1 Rewrite `App.tsx` to render `LoginPage` when the auth store has no token and `ChatPage` when it does, and verify the screen flips after a successful login
- [x] 4.2 Add a logout action that clears the token and returns to login, and verify it works from the chat screen

## 5. Chat data loading

- [x] 5.1 Seed the `chat` zustand store (`channels`, `messages`, `currentChannelId`) from `GET /api/v1/data`, and verify the response populates the store
- [x] 5.2 Verify a 401 from `GET /api/v1/data` clears the token and shows the login screen

## 6. Socket layer

- [x] 6.1 Create the socket module connecting `io()` on app entry for the authenticated user, and verify the socket connects (backend logs `socket.id`)
- [x] 6.2 Subscribe to `newMessage`, `newChannel`, `renameChannel`, `removeChannel` and dispatch into the `chat` store, and verify each event updates store state
- [x] 6.3 Emit `newMessage`, `newChannel`, `renameChannel`, `removeChannel` with ack callbacks, and verify a failed ack surfaces an inline error
- [x] 6.4 Disconnect the socket when leaving the chat screen, and verify the backend logs the disconnect

## 7. Channel UI

- [x] 7.1 Render the channel sidebar from the store with the active channel highlighted, and verify clicking a channel changes the active channel
- [x] 7.2 Implement channel creation with a name prompt, and verify the new channel appears in the sidebar after ack
- [x] 7.3 Implement renaming a removable channel, and verify the sidebar shows the new name after ack
- [x] 7.4 Implement channel removal with a confirmation step, hide the remove action for non-removable channels, and verify removal updates the sidebar after ack

## 8. Messages UI

- [x] 8.1 Render the message list for the active channel showing username and body, and verify messages of other channels are hidden
- [ ] 8.2 Implement the composer: submit emits `newMessage` for the active channel and the new message appears in the list, verified manually with two browser tabs
- [ ] 8.3 Auto-scroll the message list to the latest message, and verify it scrolls on incoming messages

## 9. Styling

- [ ] 9.1 Extend `src/index.css` with an app layout (sidebar + chat area, login page forms) reusing the existing CSS variables, and verify the layout renders sensibly in both screens

## 10. Verification

- [x] 10.1 Run `pnpm lint` and `pnpm build` and verify both pass
- [ ] 10.2 With the backend running on port 5001, run two `pnpm dev` browser tabs: sign up two users, send messages between them, create/rename/remove a channel, and verify both tabs stay in sync via sockets
- [ ] 10.3 Reload the page after login and verify the session persists (chat screen still shown), then logout and verify the login screen returns