# Tasks

## 1. Backend call signaling (project-js-chat-backend/src/routes.js)

- [x] 1.1 Add `calls: []` to `buildState` and a small helper to look up a call by id and to check whether a userId is already in any live call; verify the server starts and existing messaging events still work
- [x] 1.2 Implement `callOffer {callId, channelId, mode, sdp}`: validate the channel is private and the caller is a participant (reuse `isPrivateChannel`/`findPrivateChannel`), resolve the callee as the other participant, ack `{outcome:'offline'}` when the callee has no socket in its `user:<id>` room, ack `{outcome:'busy'}` when the callee is already in a live call, otherwise store the call and relay `callIncoming {callId, peer, mode, sdp}` to the callee room and ack `{outcome:'ringing'}`; verify by emitting `callOffer` from two test clients
- [x] 1.3 Implement `callAnswer {callId, sdp}`: relay `callAnswered {callId, sdp}` to the caller's room and mark the call active; verify the caller client receives the answer
- [x] 1.4 Implement `callSignal {callId, data}`: relay `callSignal {callId, data}` to the peer of the call (no-op if the call is unknown); verify both directions relay ICE/renegotiation payloads
- [x] 1.5 Implement `callReject {callId}`: relay `callRejected {callId}` to the caller and remove the call from state; verify the caller client receives it
- [x] 1.6 Implement `callHangup {callId, reason}`: relay `callEnded {callId, reason}` to the peer and remove the call from state; verify the peer client receives it
- [x] 1.7 Add `disconnect` cleanup: if the disconnecting user id is in a live call, notify the peer (`callEnded` with reason `disconnected`) and remove the call; verify a forced disconnect ends the peer's call

## 2. Frontend WebRTC engine (src/webrtc.ts)

- [x] 2.1 Add call types to src/types.ts (`CallMode`, `CallPhase`, `CallSignalData`, incoming/ended payloads) and verify `tsc` remains clean
- [x] 2.2 Implement the peer connection factory (config with Google STUN), `getUserMedia` for audio/video, and offer/answer helpers; verify with `pnpm build`
- [x] 2.3 Implement trickle-ICE handling that buffers candidates until the remote description is set, then flushes them via `addIceCandidate`; verify a connecting pair exchanges ICE without errors into a connected state
- [x] 2.4 Implement `replaceTrack` switching for screen share (camera track swapped for the display track and back, or removed when both are off) and renegotiation for camera toggles; verify the peer sees the screen stream then the camera again
- [x] 2.5 Implement media controls (mute/unmute microphone, camera on/off) and full teardown (stop all tracks, close the connection); verify tracks stop and there are no leaks between consecutive calls

## 3. Frontend call store, socket wiring and orchestrator

- [x] 3.1 Create src/store/calls.ts with the zustand state machine (`idle|calling|ringing|active|ended`), `direction`, `mode`, `channelId`, `peer`, `micOn/camOn/screenOn`, `error`, and actions for each transition; verify with a small state-transition check in the UI/devtools
- [x] 3.2 Add socket emitters `emitCallOffer/Answer/Signal/Reject/Hangup` and listeners for `callIncoming/callAnswered/callSignal/callRejected/callEnded` in src/socket.ts that forward into the call manager; verify events round-trip through the running backend
- [x] 3.3 Create src/callManager.ts orchestrating store + webrtc + socket: `startCall(mode)`, `accept()`, `decline()`, `hangup()`, `handleSignal(data)`, plus the caller's ~30 s ringing timeout; verify a call starts, connects, and ends cleanly between two browser tabs
- [x] 3.4 On accept, make sibling tabs of the same callee dismiss their ringing prompt (client listens for the call becoming active/ended); verify with two tabs of the same account logged in

## 4. Call UI

- [x] 4.1 Create CallButtons (voice and video) shown only in private chat headers (activeChannel.private, next to the peer avatar) and disabled while a call is active; verify buttons appear in a private chat and are absent in shared channels
- [x] 4.2 Create IncomingCallOverlay: full-screen prompt with peer avatar/name, accept/decline, Web Audio ringtone, ~30 s auto-dismiss; verify ringtone stops on accept, decline and timeout
- [x] 4.3 Create ActiveCallOverlay: peer video (or avatar fallback), self picture-in-picture, duration timer, controls for mic, camera, screen share and hangup, and a dedicated area showing the peer's shared screen; verify controls reflect state and screen share swaps the main view
- [x] 4.4 Wire overlays and buttons into ChatPage (mount overlays app-wide, independent of the active channel) and add styles following the existing index.css conventions; verify the call UI stays live while navigating between channels

## 5. Verification

- [x] 5.1 Run `pnpm lint` and `pnpm build` in the frontend repo — both must pass with the new code
- [ ] 5.2 End-to-end manual test with two accounts across two tabs/browsers: start voice and video calls, accept, decline, busy (peer already in a call), offline peer, no-answer timeout, mute, camera toggle, screen share (screen/window/tab) and stop, hangup from both sides, and reload-during-call — every scenario matches the specs in specs/calls/spec.md