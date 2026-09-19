# Proposal

## Why

Registration and login currently accept a single `username` field. To make accounts more personal and recoverable, signup should require an email, a nickname, and a password, and login should accept either the email or the nickname — so users are not locked to remembering the exact nick they registered with.

## What Changes

- **Signup** now requires three fields: **email**, **nickname (`username`)**, and **password**. Both email and nickname must be unique; duplicate email or duplicate nick is rejected with a 409 and a specific message.
- **Login** now accepts a single identifier that is either the registered **email** or the registered **nickname**, plus the password.
- Response shape stays `{ token, username }` in both cases, where `username` is always the **nickname** — the identifier chat uses to attribute messages, so message sending and rendering are unaffected.
- Email is normalized to lowercase (trim + lowercase) on signup and login; nicknames keep their original case.
- **BREAKING**: The backend user model becomes `{ id, username, email, password }`; `/api/v1/signup` and `/api/v1/login` accept the new payloads. The seeded `admin` user gains an email. Existing clients that send `{ username, password }` to `/signup` or a bare `username` identifier to `/login` no longer work.
- Frontend error handling distinguishes "email already used", "nick already used", and invalid credentials by surfacing the backend-provided message.

## Capabilities

### New Capabilities

- `user-auth`: The authentication contract for the frontend. Note: `user-auth` exists only as an in-flight delta in the `add-auth-and-chat` change and is not yet part of the main spec inventory; this change establishes it as the auth capability going forward and supersedes the signup/login requirements defined there.

### Modified Capabilities

- None. The existing main specs (`chat`, `gif`, `initial-screen`) have no requirements affected by the auth changes: message attribution via nickname is unchanged.

## Impact

- **Backend** (`project-js-chat-backend`, sibling repository, no OpenSpec): `src/routes.js` — user model gains `email`; `POST /api/v1/signup` requires `{ email, username, password }` with duplicate checks on both; `POST /api/v1/login` accepts `{ identifier, password }` resolved against email or username; seeded `admin` gets `email`. `README.md` API examples updated.
- **Frontend** (this repository): `src/api/auth.ts` — new `signup(email, username, password)` and `login(identifier, password)` payloads; `src/api/client.ts` — surface server-provided error message on non-OK responses; `src/pages/LoginPage.tsx` — email field in signup, single "Email или ник" field in login, inline validation and error messages. `src/store/auth.ts` unchanged (stored `username` remains the nickname).
- **API/contract**: wire protocol for `/api/v1/signup` and `/api/v1/login` changes as described above.