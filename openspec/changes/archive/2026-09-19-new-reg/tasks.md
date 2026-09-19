# Tasks

## 1. Backend contract (`project-js-chat-backend`)

- [x] 1.1 In `src/routes.js`, add `email` to the seeded admin user (e.g. `admin@example.com`) and document that `buildState(defaultState)` users must carry `email`; verify the server starts with `pnpm start` and `/api/v1/data` returns data for `admin`
- [x] 1.2 Rework `POST /api/v1/signup` to read `{ email, username, password }`, normalize `email` (trim + lowercase), reject with 409 `{ error: 'Этот email уже используется' }` when the email exists in `state.users`, reject with 409 `{ error: 'Этот ник уже используется' }` when the username exists, push `{ id, username, email, password }`, and respond 201 `{ token, username }`; verify via curl that a first signup returns 201, a duplicate email returns 409 with the email message, and a duplicate nickname returns 409 with the nick message
- [x] 1.3 Rework `POST /api/v1/login` to read `{ identifier, password }`, find the user by `email === identifier.trim().toLowerCase()` (email wins on collision) or `username === identifier`, respond 401 on miss or wrong password, and respond `{ token, username }` (username is the nickname); verify via curl that login by email returns 200 with the nickname, login by nickname returns 200, and a wrong password returns 401
- [x] 1.4 Update the `README.md` login/signup examples to the new payloads; verify the curl snippets match the implemented routes

## 2. Frontend auth API (`project-js-chat-frontend`)

- [x] 2.1 Change `src/api/auth.ts`: `signup(email, username, password)` posts `{ email, username, password }`, `login(identifier, password)` posts `{ identifier, password }`, keep `AuthResponse` as `{ token, username }`; verify `pnpm lint` and `pnpm build` pass and the built types match the new signatures
- [x] 2.2 Extend `src/api/client.ts` so a non-OK response tries to parse `{ error }` from the JSON body and throws `ApiError(status, serverMessage)`, falling back to the current `Ошибка запроса (N)` message; verify a mocked 409 with a JSON body surfaces the server message and a non-JSON error keeps the fallback

## 3. Login screen (`src/pages/LoginPage.tsx`)

- [x] 3.1 Add an **Email** field to the signup mode with `autoComplete="email"` and a basic email-format check that blocks submission with an inline error; verify an invalid email (e.g. `not-an-email`) shows the error and a valid email submits
- [x] 3.2 Replace the login-mode field with a single **Email или ник** input (`autoComplete="username"`) and submit `{ identifier, password }`; verify logging in by email and by nickname both reach the chat screen
- [x] 3.3 Rework `describeError` to prefer the server-provided message (distinguishing "email уже используется" / "ник уже используется" for 409, keeping 401 → "Неверный email/ник или пароль" and status-0 → "Не удалось подключиться к серверу"); verify each message appears inline without leaving the form

## 4. Verification

- [x] 4.1 Run `pnpx eslint .` in the backend repo and `pnpm lint` + `pnpm build` in the frontend repo; verify all pass
- [x] 4.2 With the backend on port 5001, run the curl matrix for the new contract (signup 201/duplicate email 409/duplicate nick 409, login by email 200, login by nick 200, invalid credentials 401); verify each status and response body
- [ ] 4.3 Run two `pnpm dev` tabs end-to-end: register a user with email + nick + password, log in that user via email in one tab and via nickname in a second tab, send a message from each and verify the other tab shows the sender's nickname; reload a tab and verify the session persists