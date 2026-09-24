# Proposal

## Why

The messenger today only supports asynchronous text exchanges in private chats. Users want to reach each other directly — voice and video calls in real time, with the ability to share their screen — using the existing Socket.IO signaling already in place.

## What Changes

- Add a call system for private (one-to-one) chats only: users can start a voice or video call with the peer of any private channel.
- Add real-time call signaling through the project's own Socket.IO backend (per-user rooms `user:<id>`), no external call provider.
- Add an incoming-call experience: full overlay with ringtone, accept/decline, ringing timeout, and presence feedback (peer offline / busy / no answer).
- Add an active-call experience: two-way audio/video media over WebRTC (STUN-only), mute, camera toggle on both sides during the call, hangup from either side, live duration.
- Add screen share during an active call using the native `getDisplayMedia` picker (screen / window / tab); the screen replaces the sharer's camera (`replaceTrack`), either participant can share, the latest sharer wins.
- Call state is backend in-memory only (like the rest of the server state); no call history or recording.

## Capabilities

### New Capabilities
- `calls`: Lets two users of a private chat talk in real time — starting a voice/video call, receiving and answering an incoming call, conducting the call (microphone, camera, screen share, hangup), and being told when a call cannot connect (peer offline, busy, or no answer).

### Modified Capabilities
<!-- No existing capability changes: direct-messages, contacts, user-auth etc. keep their requirements. -->

## Impact

- **Backend** (`project-js-chat-backend/src/routes.js`): new in-memory `state.calls`; new Socket.IO events `callOffer` / `callAnswer` / `callSignal` / `callReject` / `callHangup` handled on connect, relayed through the existing `user:<id>` rooms; `disconnect` cleanup that notifies the peer and clears the call. Reuses the existing private-channel validation helpers (`isPrivateChannel`, `findPrivateChannel`).
- **Frontend** (`project-js-chat-frontend`):
  - `src/types.ts` — call types (`CallMode`, call event payloads).
  - `src/webrtc.ts` (new) — WebRTC engine: `RTCPeerConnection` (STUN), `getUserMedia`, `getDisplayMedia`, trickle ICE, renegotiation, `replaceTrack` camera/screen switching.
  - `src/store/calls.ts` (new) — zustand call state machine (`idle | calling | ringing | active | ended`).
  - `src/callManager.ts` (new) — orchestrator wiring store + WebRTC + socket emitters (avoids store↔socket import cycle).
  - `src/socket.ts` — new emitters and listeners for call events.
  - `src/components/CallButtons.tsx`, `IncomingCallOverlay.tsx`, `ActiveCallOverlay.tsx` (new) — call entry points in the DM header and the call overlays.
  - `src/pages/ChatPage.tsx` — mounts overlays and wires the buttons.
- **Dependencies**: no new runtime dependencies (`getUserMedia` / `getDisplayMedia` are browser APIs; ringtone uses Web Audio).
- **Known limitations to record**: STUN-only (strict NAT may block media); multi-tab/multi-device of the same user not fully handled; media APIs require HTTPS or localhost.