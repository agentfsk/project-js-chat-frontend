# Proposal

## Why

WebRTC calls are unreliable: during the ringing phase the recipient drops the caller's ICE candidates, so video/audio only start flowing after the two sides renegotiate (usually triggered by an accidental camera toggle). Turning the camera off leaves the peer staring at a frozen last frame, and re-enabling the camera often never resumes because media negotiation has no glare/race handling and relies on `replaceTrack(null)`.

## What Changes

- Buffer ICE candidates that arrive while the recipient has not yet created its call engine, and apply them once it accepts — so media flows immediately after the call starts, without any camera toggle.
- Stop using `sender.replaceTrack(null)` to disable the camera. Toggle the video transceiver `direction` (`sendrecv`/`recvonly`) and the camera track's `enabled` flag instead, so the peer reliably receives a `mute` event (placeholder, not a frozen frame) and re-enabling reliably resumes the stream.
- Make renegotiation race-safe (perfect negotiation pattern: a renegotiation-needed flag, glare handling via polite/impolite peers) so offers are never silently dropped and a camera toggle can never deadlock the connection.
- Keep screen sharing working on top of the new camera/transceiver model, including toggling camera while a screen is shared.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `calls`: The requirement "Conduct an active call with media controls" gains scenarios covering (1) media flowing immediately when the call becomes active without requiring a camera toggle, and (2) turning the camera off showing a placeholder with no frozen last frame, with re-enabling reliably resuming video.

## Impact

- `src/webrtc.ts` — rework camera/screen handling and negotiation in `CallEngine` (transceiver direction instead of `replaceTrack(null)`, race-safe negotiation).
- `src/callManager.ts` — buffer ICE candidates arriving before the call engine exists and flush them on accept; clear the buffer on teardown.
- `src/components/ActiveCallOverlay.tsx` — small adjustments so the remote video placeholder is driven by track `mute`/`unmute` (already used), no frozen frame shown.
- No server/API changes: the backend already relays `callSignal` at any time during a call.