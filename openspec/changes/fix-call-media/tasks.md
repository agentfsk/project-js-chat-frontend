# Tasks

## 1. Verify signalling assumptions

- [x] 1.1 Confirm with the backend that `callSignal` events are delivered to a ringing client before it accepts (inspect backend source or instrument `socket.ts`); record the observed event stream so the buffering design matches reality. Verify: a log shows ICE candidates arriving on the recipient while its call engine does not exist yet.

## 2. Buffer ICE candidates during ringing

- [x] 2.1 In `callManager.ts`, collect `callSignal` ICE messages (and any late `offer`/`answer` signalling) that arrive while the call engine is `null` into an in-memory buffer instead of dropping them; clear the buffer in `endCall`/`teardownEngine`. Verify: `onCallSignal` no longer silently discards messages and the buffer is reset on teardown.
- [x] 2.2 On `accept()`, flush buffered messages into the freshly created engine before completing the answer, relying on `CallEngine.handleIce`'s pending queue for candidate ordering. Verify: two-client video call, recipient answers ~3s after ringing starts, and both sides immediately see video without toggling anything.

## 3. Control the camera via transceiver direction

- [x] 3.1 In `CallEngine`, expose a video transceiver: use `pc.addTransceiver(cameraTrack, { streams: [localStream] })` when the call mode is video, and create it on demand with `getUserMedia({ video })` when a camera is enabled during an audio call. Verify: video calls and audio→video upgrades both produce a single video RTP sender.
- [x] 3.2 Rewrite `setCamEnabled` so ON sets transceiver `direction = 'sendrecv'` and `track.enabled = true`, OFF sets `direction = 'recvonly'` and `track.enabled = false`, and never calls `replaceTrack(null)`. Verify: turning the camera off makes the peer show the placeholder immediately (no frozen last frame) with the camera LED off, and turning it back on resumes video reliably.
- [x] 3.3 Keep `startLocalMedia` camera capture intact so a video call tracks the camera from the start without a toggle. Verify: `navigator.mediaDevices.getUserMedia` fires once at call start for video mode and the local self-view renders.

## 4. Race-safe negotiation

- [x] 4.1 Add a `requestNegotiation()` entry point with a `negotiationNeeded` flag: negotiate when `stable`, else re-run as soon as the connection becomes stable; route all camera/screen changes through it. Verify: toggling during an in-flight negotiation does not get lost (a queued negotiation runs afterwards).
- [x] 4.2 Implement perfect-negotiation glare handling in `handleOffer`/`handleAnswer`: mark the caller side impolite and the callee side polite, resolve overlapping offers via `rollback()` or ignoring as the pattern dictates, and never drop an offer silently. Verify: both participants toggling cameras rapidly and simultaneously keeps the call active and video resumable in every round.
- [x] 4.3 Wire `pendingCandidates`/`flushCandidates` to the new state checks so ICE candidates apply after every completed negotiation. Verify: no `Unhandled ICE candidate` warnings in devtools during repeated renegotiations.

## 5. Screen sharing on the new video model

- [x] 5.1 Rework `startScreenShare`/`stopScreenShare` to bind the share to the video transceiver (replace the camera track with the screen track, direction `sendrecv` while sharing; on stop restore the camera track or set `recvonly`). Verify: start/stop share works; sharing while the camera is off leaves the peer with the placeholder after the share stops; sharing while on restores the camera.
- [x] 5.2 Edge case: a camera toggle while the screen is shared keeps showing the share and does not disturb the camera-track state. Verify: toggling cam during a share leaves the peer's view on the shared screen and the camera resumes correctly after the share ends.

## 6. Call UI regression

- [x] 6.1 Confirm `ActiveCallOverlay` placeholder logic reacts to `mute`/`unmute` on the remote video track (no stale `<video>` element shows a frozen frame); adjust only if a muted track can render. Verify: camera-off on one side swaps to the avatar/placeholder on the other side without a visible leftover frame.
- [x] 6.2 Run `pnpm lint` and `pnpm build` and fix any issues. Verify: both pass.
- [ ] 6.3 Full two-client matrix: video call immediate media, off→on camera both sides, rapid simultaneous toggles, audio→video upgrade, screen share cycles, call from a ringing client that answers late. Verify: all behaviours in the `fix-call-media` delta-spec scenarios hold in Chrome and Firefox.