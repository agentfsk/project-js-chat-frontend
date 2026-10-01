# Proposal

## Why

The app currently only verifies backend connectivity; it is not yet a messenger where people can actually communicate. The goal is a working text chat: users register or log in, pick a channel, and exchange messages in real time.

## What Changes

- Replace the initial screen (`App.tsx`) with a token gate: an authentication screen (login + signup) when no token is stored, and the chat screen when one is present.
- Add an authentication layer: `POST /api/v1/login`, `POST /api/v1/signup`, token kept in `localStorage`, cleared on `401`.
- Add a chat screen with a channel sidebar (create / rename / remove channels, `general` and `random` are non-removable), a message list for the active channel, and a message composer.
- Fetch the initial state from `GET /api/v1/data` (`channels`, `currentChannelId`, `messages`) on entering the chat.
- Add real-time sync over Socket.IO: listen for `newMessage`, `newChannel`, `renameChannel`, `removeChannel`; emit the matching events with acknowledgement callbacks for error handling.
- Remove the connectivity-check screen and its state from `src/App.tsx`; it is superseded by the authentication screen. **BREAKING** for the current UI.
- Add two runtime dependencies: `socket.io-client` (realtime) and `zustand` (shared chat state).

## Capabilities

### New Capabilities
- `user-auth`: Authenticate users against the backend (login and signup), persist the token, and gate the chat screen on it.
- `chat`: Render channels, messages, and a composer; keep them in sync with the backend over Socket.IO.

### Modified Capabilities
- `initial-screen`: Requirement "Initial screen renders a greeting" and "Backend connectivity check" are superseded by the authentication screen and the chat itself; both requirements are removed.

## Impact

- **Code**: `src/App.tsx` rewritten; new `src/pages/`, `src/components/`, and `src/store/` modules; `src/index.css` extended for layout.
- **API**: consumes `POST /api/v1/login`, `POST /api/v1/signup`, `GET /api/v1/data`, and the Socket.IO events via the existing `/api` proxy; backend unchanged.
- **Dependencies**: adds `socket.io-client` and `zustand` to `package.json`.
- **Config**: `vite.config.ts` proxy reused as-is; no change.