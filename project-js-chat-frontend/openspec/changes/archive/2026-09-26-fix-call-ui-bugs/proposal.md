# Proposal

## Why

Manual two-client QA found call and direct-message flows misbehaving around peers who are not yet accepted contacts and around abrupt call interruptions: non-contact DMs showed a placeholder title and a dead avatar button, outgoing contact requests were invisible to the frontend, a peer whose camera turned off left a stale frame on the other side, and a peer interrupted by the other party's disconnect stayed stuck busy. The fixes are implemented and committed (frontend `d6a9551`, backend `67901f0`); this change formalizes the behavior and its verification.

## What Changes

- Direct-message title and the «личные» sidebar entry for a peer who is **not** an accepted contact render the peer's real nickname and avatar (resolved from incoming and outgoing contact-request payloads) instead of a channel-generated placeholder, and show a «не в контактах» badge.
- The avatar button on a non-contact DM row opens the peer's profile with its add-to-contacts affordance, so the user is not stuck in a non-contact chat with no way to add the peer.
- The backend now returns the caller's pending outgoing contact requests (`outgoingRequests` on the data endpoint); the frontend seeds those peers' profiles so a chat with a peer you already asked to add resolves their nickname and avatar. Additive field, no breaking API change.
- Remote-video detection derives from the negotiated receiving direction (any `recv` video transceiver, not merely the first video sender) so turning the camera off shows the placeholder immediately — no frozen frame — and turning it back on reliably resumes video.
- Call state is cleaned up by exact socket id when a participant disconnects, so after a connection drop / page reload the interrupted peer is no longer stuck busy or ringing and can be called again straight away.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities
- `direct-messages`: private-chat title and «личные» entry must resolve the peer's real nickname and avatar even when the peer is not yet an accepted contact.
- `contacts`: a sent-but-unaccepted outgoing request must resolve the peer's real profile in the resulting private chat, not a dead end.
- `calls`: a call interrupted by the peer's disconnection must clear state on both sides so nobody is left busy or ringing.

## Impact

- Frontend: `src/pages/ChatPage.tsx` (title, profiles seeding), `src/components/ChannelBar.tsx` (DM row: avatar → `ProfileModal`, nickname, «не в контактах» badge), `src/store/users.ts` (`setInitialData` seeds peer profiles from incoming and outgoing requests), `src/api/data.ts` / `src/types.ts` (`OutgoingContactRequest`, `outgoingRequests` on `DataResponse`), `src/webrtc.ts` (`updateRemoteMedia` uses any receiving video transceiver).
- Backend: `src/routes.js` — `callOffer`/`callAnswer` record `callerSocketId`/`calleeSocketId`, disconnect ends calls by exact socket id and emits `callEnded { reason: 'disconnected' }`, data endpoint returns `outgoingRequests`.
- No dependency or schema-breaking changes; `DataResponse` gains one optional array field.