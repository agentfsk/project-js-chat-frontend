# Proposal

## Why

The frontend is a blank Vite/React template with no connection to the chat backend, so there is no way to verify the two projects talk to each other. A minimal initial screen establishes the frontend-to-backend pipeline before the messenger grows.

## What Changes

- Replace the Vite starter demo in `src/App.tsx` with a minimal initial screen: a greeting and a "Check connection" button.
- The button calls `POST /api/v1/login` with the backend's demo credentials (`admin`/`admin`) and displays the returned `{ token, username }` or the error on the page.
- Configure a Vite dev proxy so `/api` requests are forwarded to `http://localhost:5001`.
- Clean up unused Vite template assets and styles (`src/App.css`, `src/assets/*`, demo CSS variables).
- No new runtime dependencies are introduced (uses built-in `fetch`).

## Capabilities

### New Capabilities
- `initial-screen`: Renders the greeting page and verifies backend connectivity by calling the login endpoint through the `/api` proxy.

### Modified Capabilities
<!-- None -->

## Impact

- **Code**: `src/App.tsx`, `src/index.css`, `vite.config.ts`, `index.html`; removal of `src/App.css` and `src/assets/*` demo files.
- **API**: consumes `POST /api/v1/login` via the `/api` proxy; the backend itself is unchanged.
- **Dependencies**: none added.