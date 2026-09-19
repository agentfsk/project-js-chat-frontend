# Design

## Context

See proposal.md - Why. The app spans two codebases: the OpenSpec-managed frontend (`project-js-chat-frontend`, React + Zustand + socket.io-client) and a sibling backend without OpenSpec (`project-js-chat-backend`, Fastify + Socket.IO). State lives only in backend memory: `state.users` is `[{ id, username, password }]`, seeded with `admin/admin`. Login and signup both key off `username`. The frontend stores `{ token, username }` from the auth response in localStorage and uses `username` as the sender name for `newMessage` emits, which chat renders as the author. The backend ships no tests and no lint script beyond `pnpx eslint .`.

## Goals / Non-Goals

**Goals:**
- A wire protocol where signup requires `{ email, username, password }` and login accepts `{ identifier, password }` for email **or** nickname.
- Keep the chat contract intact: responses still return `{ token, username }` where `username` is always the nickname, so message attribution and the auth store are untouched.
- Distinct user-facing errors for duplicate email, duplicate nickname, and invalid credentials.

**Non-Goals:**
- No socket/connection authorization (`// TODO add socket auth` stays out of scope).
- No password hashing, email verification, password reset, or profile management.
- No changes to `store/auth.ts` semantics or the message/channel contracts.

## Decisions

**D1. Single login field "Email или ник" (option A).** Frontend sends `{ identifier, password }`; the backend resolves the identifier against email or username. Alternatives rejected: auto-detecting `@` on the client (more client logic, and a nickname containing `@` — if ever allowed — would misroute) and separate tabs (more UI for no behavioral gain). Backend resolution: email match is case-insensitive (`u.email === identifier.toLowerCase().trim()`), nickname match preserves case. When both an email and a nickname could match different users (a user named `foo@bar.com`), email takes precedence.

**D2. Email normalized at the boundary.** On signup, store `email` as `email.trim().toLowerCase()`. On login, compare the same normalization. This makes duplicates unambiguous and login-by-email forgiving. Nickname uniqueness and matching stay case-sensitive, matching current behavior.

**D3. Backend user model `{ id, username, email, password }`; seeded admin keeps working.** Seed becomes `{ id: 1, username: 'admin', email: 'admin@example.com', password: 'admin' }`. `buildState(defaultState)` merges `state.users` passed by callers (e.g. tests/fixtures); any seeded users must now include `email` or they become unreachable. This is accepted because the only default-state consumer is the starter server.

**D4. Backend returns specific 409 bodies; the client surfaces them.** `/signup` responds 409 with `{ error: 'Этот email уже используется' }` or `{ error: 'Этот ник уже используется' }`; `/login` responds 401 with a generic message body. `api/client.ts` already parses JSON on success — extend it to read `{ error }` from a non-OK response and throw `ApiError(status, serverMessage)` with a fallback to the current generic `Ошибка запроса (N)`. `LoginPage.describeError` then prefers the server message and keeps its Russian text for the no-connection (status 0) case. This is the lightly invasive whole approach: it avoids mapping error codes to messages in two places.

**D5. Login response always returns the nickname.** `/login` returns `{ token, username: user.username }` regardless of identifier type. The frontend auth store's `username` field keeps meaning "nickname", so `MessageForm`/`socket.ts` need zero changes.

**D6. Frontend-payload functions change but not the `AuthResponse` type.** `api/auth.ts` becomes `signup(email, username, password)` → `{ email, username, password }` and `login(identifier, password)` → `{ identifier, password }`. Type-safety of the changing input stays, callers (`LoginPage`) update, the consumed `AuthResponse` shape is stable.

**D7. Scope spans both repos; the apply workflow covers only the frontend.** The change and its artifacts live in the frontend's OpenSpec home; backend tasks are documented in `tasks.md` and applied manually in the sibling repo against `src/routes.js` and `README.md`.

## Risks / Trade-offs

- **In-flight `add-auth-and-chat` delta defines the older username-only auth contract** → The new `user-auth` delta is written self-contained (ADDED-only) so it stands regardless of when either change is archived; reconciling the two user-auth deltas at archive/sync time is a documented follow-up.
- **No backend tests; the auth contract is behavior the backend must satisfy** → Verification relies on `eslint` plus a prescribed curl matrix in tasks; the matrix doubles as a manual regression suite.
- **Seeded/default users without an `email` become unreachable** → Only the `admin` seed exists; it is migrated in the same change, and defaultState callers are noted in D3.
- **Email takes precedence over nickname on login collisions** → Known and rare (nickname containing `@`); documented in D1 so it is not a surprise later.

## Migration Plan

1. Deploy backend first: update `src/routes.js` (model, seeds, signup/login) and restart the server — the frontend can keep using it until step 2 lands, since both old and new logins against the same users will keep working for nicknames.
2. Deploy frontend (`api/auth.ts`, `api/client.ts`, `LoginPage.tsx`).
3. Rollback: revert the backend commit (`git revert`) then the frontend commit; no stored data is migrated, so reverting returns the previous contract unchanged.

## Open Questions

None.