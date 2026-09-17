# Design

## Context

The frontend is a fresh Vite/React 19 + TypeScript starter in this repo. The backend lives in `../project-js-chat-backend` (Fastify on `http://localhost:5001`) and exposes `POST /api/v1/login` returning `{ token, username }` for the demo user `admin`/`admin`. See proposal.md - Why for the motivation.

## Goals / Non-Goals

**Goals:**
- A minimal, single-component initial screen that verifies backend connectivity.
- Same-origin API calls in dev so no CORS handling is needed in app code.

**Non-Goals:**
- No chat UI, auth flow, or state management yet.
- No new runtime dependencies.

## Decisions

- **Same-origin `/api` via Vite proxy** over hardcoding `http://localhost:5001` in code. The proxy forwards `/api/*` to the backend in dev, keeps URLs clean for future deployment behind nginx, and stays inside one file (`vite.config.ts`). Alternative (direct URL) works via backend CORS `*` but hardcodes an origin in the bundle.
- **Plain `fetch`** instead of adding `axios`: the login call is a single request; `fetch` avoids a new runtime dependency. `response.ok` + parsed JSON body drive the success/error branches.
- **Single `App` component with `useState`** for button state and result; no router or state library needed at this scale.
- **Clean the Vite starter demo** (App.css, `src/assets/*`, demo markup) to leave a minimal base for the future messenger.

## Risks / Trade-offs

- [Backend not running when the button is clicked] -> the request rejects, caught by `catch`, and an explicit error message is shown.
- [Proxy target hardcoded to `localhost:5001`] -> matches the backend's default port; configurable in one place for other environments.
- [In-memory backend state] -> on backend restart, demo credentials still work (`admin`/`admin` is re-seeded), so the check remains valid.