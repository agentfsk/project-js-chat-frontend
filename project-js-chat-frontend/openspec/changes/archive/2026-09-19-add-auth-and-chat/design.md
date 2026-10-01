# Design

## Context

The frontend is a Vite/React 19 + TypeScript app with a single `App.tsx` that renders a greeting and checks backend connectivity via `POST /api/v1/login` (see proposal.md - Why). The backend (Fastify + Socket.IO on `http://localhost:5001`, reached through the existing `/api` Vite proxy) exposes `POST /api/v1/login`, `POST /api/v1/signup`, `GET /api/v1/data` (JWT-protected), and Socket.IO events `newMessage`, `newChannel`, `renameChannel`, `removeChannel`. Socket events are NOT authenticated (backend `TODO add socket auth`) and carry `username` in their payloads. No testing framework is configured; the project verifies by `pnpm lint` and `pnpm build` plus manual runs against the backend.

## Goals / Non-Goals

**Goals:**
- Two runtime states with a shared, cleanup-free data flow: authenticate, then load state and follow live events.
- Minimize code churn: reuse the existing `/api` proxy and plain `fetch`; no new HTTP client.
- Keep the backend untouched; frontend-only change.

**Non-Goals:**
- No socket authentication or per-user authorization (backend doesn't support it).
- No media upload, message editing, message deletion, or pagination.
- No SPA routing library; token presence in localStorage decides the screen.

## Decisions

- **`zustand` for shared state** over React Context + `useReducer`. Chat state (channels, messages, active channel) is read and written from sidebar, message list, composer, and socket handlers; zustand gives selectors that avoid re-rendering everything on each message. `useReducer` would need the same reducer shape plus context providers and manual selector memoization for no dependency gain. Two stores: `auth` (token, username) and `chat` (`channels`, `messages`, `currentChannelId`).
- **`socket.io-client` is required** — the backend only speaks Socket.IO for realtime (version 4.x, matching `socket.io@^4.8.3` server).
- **Socket connected after auth, once, from a top-level effect** in the chat screen: `io({ path: '/socket.io', transports ... })` default options, disable when leaving the chat screen. Events are handled by dispatching directly into the `chat` store (`addMessage`, `addChannel`, `renameChannel`, `removeChannel`). Connection is not authenticated, matching the backend.
- **REST for initial load + socket for deltas.** On entering the chat, `GET /api/v1/data` returns `{ channels, currentChannelId, messages }` seeding the store; every later change arrives as a socket event, so there is no polling and no duplicate-fetch state machine.
- **Fetch wrapper with a shared `401` handling** (`src/api/`): attaches `Authorization: Bearer <token>`, parses JSON, and on 401 clears the auth store (login screen). Used by login, signup, and `data`.
- **Ack callbacks for emit-side errors.** The backend accepts `acknowledge` on `newChannel` / `renameChannel` / `removeChannel` / `newMessage`; the UI treats a failed ack (e.g., duplicate channel name) as an error surfaced inline, not a crash.
- **Channel switching is client-only**: clicking a channel sets `currentChannelId` in the `chat` store; no REST/socket round-trip needed.
- **Token persisted in `localStorage`** (not `sessionStorage`) so the session survives page reloads — the expected behavior of a messenger. Alternative (session-only) was considered and rejected for the "working result" goal.
- **Component split** mirrors the screens: `App.tsx` gates on the auth token, `src/pages/LoginPage.tsx` (tabbed login/signup), `src/pages/ChatPage.tsx` (arrow the three panes), plus small `src/components/` pieces. `index.css` grows layout styles; existing CSS variables are reused.
- **No Russian/English i18n layer** — hardcoded Russian UI strings, matching the current app (verbose labels > abstractions at this scale).

## Risks / Trade-offs

- [Socket not authenticated] → Anyone can send messages with any `username`; accepted because the backend is a teaching server. The UI uses the logged-in username, so a normal user's messages are attributed correctly.
- [Race between `GET /data` and a socket event] → Both append only; initial load replaces store contents, then socket events add deltas. A message arriving between HTTP response and socket subscription is missed until the next backend restart; acceptable for the teaching server and avoided by subscribing before replacing seeded data where possible.
- [Duplicate channel name on server is silently acked as `ok`] → The backend assigns channels ids and doesn't dedupe names; the UI treats every `ok` ack as success, surfacing only error acks. Duplicate-name UX is out of scope.
- [Token stale after backend restart] → `/data` returns 401, wrapper clears the token, user sees the login screen again — no error flash.
- [Memory growth of the `messages` array] → Bounded by backend in-memory state; no pagination needed for a teaching workload.

## Migration Plan

Frontend-only change with no backend or deployment impact: merge swaps the running app; rollback is a `git revert` of the change. No data migration.