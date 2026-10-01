# Tasks

## 1. Dev proxy setup

- [x] 1.1 Add an `/api` proxy to `http://localhost:5001` in `vite.config.ts` and verify `vite` starts without configuration errors

## 2. Clean the Vite template

- [x] 2.1 Remove demo files `src/App.css` and `src/assets/react.svg`, `src/assets/vite.svg`, `src/assets/hero.png`, and verify the project still builds (`pnpm build`)
- [x] 2.2 Replace `src/index.css` with a minimal base stylesheet and verify `runs pnpm lint` passes
- [x] 2.3 Update `index.html` (lang, title) for the chat app and verify the served HTML reflects it

## 3. Initial screen

- [x] 3.1 Rewrite `src/App.tsx` to render a greeting and a "Check connection" button, and verify it shows the greeting on load
- [x] 3.2 Implement the login call: on click, `POST /api/v1/login` with `admin`/`admin` via `/api`, and verify a successful response displays the username and token
- [x] 3.3 Handle failure: network error or non-2xx response shows an error message instead of crashing, verified by stopping the backend and clicking the button

## 4. Verification

- [x] 4.1 Run `pnpm lint` and `pnpm build` and verify both pass
- [x] 4.2 With the backend running on port 5001, start `pnpm dev`, click "Check connection", and verify the response shows username `admin` and a token