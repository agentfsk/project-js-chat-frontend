# Design

## Context

The call stack is split between `callManager.ts` (orchestration + socket events), `webrtc.ts` (`CallEngine`, media + negotiation), `store/calls.ts` (UI state), and `ActiveCallOverlay.tsx` (rendering). Signalling is socket.io with ack-based emits; the backend relays `callSignal`/`callOffer`/`callAnswer`/`callEnded` at any point in a call (verified: the offer itself arrives while the recipient has no engine yet).

Three concrete defects drive this design (see proposal.md - Why):

1. `callManager.onCallSignal` drops signal events while `engine === null` (the whole ringing window) - the caller's ICE candidates are lost, so one media direction stays dead until a later renegotiation (a camera toggle) repairs it.
2. `setCamEnabled(false)` uses `sender.replaceTrack(null)`; re-attaching later is not reliable, and because the renegotiation guard in `handleOffer`/`renegotiate` silently drops any offer arriving while `makingOffer` or `signalingState !== 'stable'`, a glare (both sides toggling) freezes the connection in `have-local-offer` with no recovery - video "stops turning on".
3. The frozen last frame is a symptom of 2: without a completed renegotiation the peer's receiver never gets the `mute` event, so `useVideoMuted` never flips and `ActiveCallOverlay` keeps showing the stale `<video>`.

`camOn` already starts `true` for video-mode calls (store `beginOutgoing`/`beginIncoming`), so the camera is never the reason media is missing - negotiation and signalling are.

## Goals / Non-Goals

**Goals:**
- Media flows in both directions from the moment the call becomes active, without user toggling.
- Turning the camera off shows the peer an immediate placeholder (no frozen last frame); turning it back on reliably resumes - under rapid and simultaneous toggling.
- Keep screen sharing functional on the reworked camera model.
- Frontend-only change; no server/API/schema changes.

**Non-Goals:**
- No audio quality / codec tuning, no TURN server provisioning (STUN-only stays as-is).
- No multi-party calls, no call-quality statistics, no reconnect-after-network-loss behavior.
- No change to the incoming-call UX (permission prompt only on accept).

## Decisions

### D1: Buffer ICE candidates until the call engine exists

Rather than dropping `callSignal` (ICE) events while `engine === null`, buffer them in `callManager`. On `accept()` flush them into the freshly created engine - `CallEngine.handleIce` already queues candidates until a remote description is set, so ordering is safe. Buffer is cleared in `endCall`/`teardownEngine`.

Alternative considered: create the engine at incoming-call notification. Rejected: `startLocalMedia` calls `getUserMedia`, which would fire the camera/mic permission prompt (and start capture) before the user accepts - unacceptable UX and privacy behavior.

### D2: Control the camera via transceiver `direction`, never `replaceTrack(null)`

- Keep one video transceiver per call. Video-mode `startLocalMedia` creates it via `pc.addTransceiver(cameraTrack, { streams: [localStream] })`; an audio-mode call that later turns the camera on creates the same transceiver on demand (`getUserMedia({ video })` + `addTransceiver`).
- Camera ON: `transceiver.direction = 'sendrecv'` + `track.enabled = true`. Camera OFF: `transceiver.direction = 'recvonly'` + `track.enabled = false` (the camera LED on the device turns off).
- Never `sendTrack(replace)Track(null)`: the video transceiver always carries either the camera track or the screen-share track.

Why this over `replaceTrack(null)`: the renegotiated SDP marks the m-line `sendrecv`/`recvonly`, so the peer's receiver reliably fires `mute`/`unmute` even under noise, which the existing `useVideoMuted` hook already maps to the placeholder/avatar UI. No browser-specific `replaceTrack(null)` resurrection quirks. A purely local fallback (keep the track and set `enabled=false`, sending black frames) was rejected: the peer would see a black box rather than a placeholder, and no `mute` event is generated.

### D3: Race-safe negotiation (perfect negotiation pattern)

Replace the drop-on-race guards with the standard perfect-negotiation approach:

- A `negotiationNeeded` flag: renegotiation requests (camera toggles, screen share) call `requestNegotiation()`, which runs a negotiation if the connection is `stable`, otherwise sets the flag and runs it once `stable`.
- Glare handling with a polite/impolite split tied to call direction:
  - **Polite** peer = the incoming/callee side (created by `accept`).
  - **Impolate** peer = the outgoing/caller side (created by `startCall`).
  - On receiving an offer while `signalingState === 'have-local-offer'`: the polite peer applies `rollback()` and accepts the incoming offer (yields), while the impolite peer ignores the incoming offer - that peer already has its own offer in flight and its answer settles the exchange. Reuse the well-known MDN variant for `negotiationneeded` + offer answering; after being ignored, the polite peer renegotiates once `stable` to fold in anything new.
- Guard both `handleOffer` and `handleAnswer` so candidates never get dropped and answered offers are always delivered (tie the existing `pendingCandidates`/`flushCandidates` into the same state checks).

This removes the deadlock that made re-enabling the camera impossible, and the "toggle repairs media" crutch from D1/D3 handling.

### D4: Screen sharing on the single video transceiver

Sharing replaces the video transceiver's track with the screen track (`replaceTrack(screenTrack)`), with direction forced `sendrecv` while sharing. On stop, restore the camera track if the camera is on, otherwise set the transceiver `recvonly` (not a null track). `screenStream`/`ended` handling stays. Camera toggle during an active share keeps the share as the source (matching today's early return).

## Risks / Trade-offs

- **Transient mute/unmute flicker during renegotiation** → the placeholder may blink for one frame on toggle; acceptable and self-correcting (`useVideoMuted` listens on the live track). Pod prioritized correctness over animation smoothness.
- **Browser differences in `mute` event delivery timing** → the design relies on direction-driven renegotiation, which all evergreen browsers signal consistently; the dedicated manual test matrix covers Chrome + Firefox.
- **Camera toggle while a screen is shared is subtle** → bound to one video transceiver with a single source; verified in tests, and the UI still reflects the camera button state independently of the shared source.
- **Glare logic adds a small state machine** → mitigates the permanent freeze bug; kept to the standard MDN perfect-negotiation surface, not a custom protocol.
- **Buffer growth if a peer never accepts** → buffer bounded by the ringing timeout (30s) and cleared on teardown; no realistic growth concern.

## Migration Plan

Frontend-only: land the reworked `webrtc.ts`, `callManager.ts` and `ActiveCallOverlay.tsx` adjustments together (they are one unit - a partial deploy halves the protocol). Rollback = revert the change; old and new clients interoperate because both speak the same SDP/ICE signalling surface (sendrecv/recvonly renegotiation is standard), so mixing versions during a rolling deploy does not break calls.

## Open Questions

None that re-open the specs, approach, or task breakdown. Assumption to verify during apply: the backend forwards `callSignal` events even before the recipient answers (confirmed for the offer; candidates assumed symmetric and checked in the first apply task).