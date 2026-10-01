# Tasks

## 1. Non-contact DM rendering

- [x] 1.1 Seed profiles for non-contacts in `setInitialData`: build the `profiles` record from `me`, `contacts`, incoming `requests[].from`, and outgoing `outgoingRequests[].to`. Verify: every private chat reachable from the «личные» list resolves its peer to a profile (no placeholder path).
- [x] 1.2 Render the DM title from the peer's profile nickname (`peerProfile.username`, falling back to `channel.name`) instead of the raw channel name, and label the sidebar row with the peer's nickname plus a «не в контактах» badge when the peer is not an accepted contact. Verify: both the sender of a pending incoming request and the recipient of a pending outgoing request show their real nickname in the chat title; the badge appears only for non-contacts.
- [x] 1.3 Make the DM row's avatar button open the peer's `ProfileModal` so the add-to-contacts affordance is reachable from the row. Verify: clicking the avatar opens the profile with «Добавить в контакты», and for a pending request the profile shows the already-sent state.

## 2. Outgoing request data

- [x] 2.1 Backend: return the user's pending outgoing contact requests (`id`, `to`, `channelId`, `status`) from the data endpoint. Verify: a session that previously sent a request sees it in the initial data response.
- [x] 2.2 Frontend: add `OutgoingContactRequest` to the API types, read `data.outgoingRequests`, and pass it into `setInitialData`. Verify: the requester's chat with that peer resolves the real nickname and avatar without any extra request.

## 3. Remote video placeholder state

- [x] 3.1 Rewrite `updateRemoteMedia` so remote video is active when any video transceiver's direction is `null` or includes `'recv'`, instead of trusting the first video sender. Verify: camera off shows the placeholder immediately on the peer side with no stale frame; camera on resumes reliably.

## 4. Call interruption cleanup

- [x] 4.1 Backend: record `callerSocketId`/`calleeSocketId` on the call; on disconnect, end the call by that socket id, emit `callEnded { reason: 'disconnected' }` to the remaining peer's socket, clear the room and the busy flag. Verify: after one participant reloads mid-call, the other can call them again right away and neither side stays ringing or busy.

## 5. Verification

- [x] 5.1 Run the automated two-client harness covering: non-contact DM badge/title/profile/buttons, requester-after-reload profile resolution, direct video (remote + self view), camera-off placeholder, camera-on resume, audio→video upgrade, busy-while-active, and recall-after-disconnect. Verify: all 17 checks pass.
- [x] 5.2 Run `pnpm lint` and `pnpm build` in both the frontend and backend repos. Verify: both pass.
- [x] 5.3 Manual matrix in Chrome and Firefox: non-contact DM flows, camera off→on from both sides, call interrupted by reload, and a re-call immediately after the interrupt. Verify: all fix-call-ui-bugs delta-spec scenarios hold in both browsers.