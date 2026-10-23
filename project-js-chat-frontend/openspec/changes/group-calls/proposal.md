# Proposal

## Why

The messenger currently supports only 1:1 WebRTC calls. Users need group voice/video calls (like Telegram's voice chats) for conferences, team meetings, and social conversations. This requires a Selective Forwarding Unit (SFU) architecture for scalable media routing and MLS (Messaging Layer Security) for end-to-end encryption in groups.

## What Changes

- **New SFU media server** (`project-js-media-server/`) — mediasoup-based, handles audio/video routing for group calls
- **New backend signaling** — Socket.io events for group call join/leave, produce/consume, peer updates
- **New shared package modules** — `GroupCallEngine` (mediasoup client), MLS integration for E2EE, group call store
- **Mobile app** — Group call screen (grid/speaker view), join/leave buttons in group info, foreground service for background audio
- **Web frontend** — Group call screen with grid view, screen sharing support
- **Backend modifications** — Group call state management, integration with SFU, FCM push for group call invites
- **MLS integration** — Replace Double Ratchet with MLS for group E2EE (new capability)
- **Breaking changes**: None (additive only)

## Capabilities

### New Capabilities

- `group-calls`: Group voice/video calls via SFU (mediasoup). Covers join/leave, media produce/consume, grid/speaker view, screen sharing, participant management.
- `mls-e2ee`: End-to-end encryption for group calls using MLS (Messaging Layer Security). Covers group key agreement, epoch-based key rotation, welcome messages for late joiners.

### Modified Capabilities

- `calls`: Extended to support group call type alongside 1:1. Group calls use SFU/MLS instead of P2P/Double Ratchet.
- `groups`: Group info screen adds "Start voice chat" button; group calls tied to group channel.

## Impact

**Frontend (`project-js-chat-frontend`):**
- New `GroupCallScreen` component with grid/speaker view
- Screen sharing in groups
- WebRTC integration with mediasoup client

**Mobile (`project-js-android/apps/mobile`):**
- Group call screen with foreground service for background audio
- Join/leave from group info screen
- Push notifications for group call invites

**Shared (`project-js-android/packages/shared`):**
- New `GroupCallEngine` using `mediasoup-client`
- MLS integration (`@openmls/rust` or `mls-ts`)
- Group call store (participants, tracks, speaking indicators)

**Backend (`project-js-chat-backend`):**
- New `project-js-media-server/` (mediasoup worker)
- Socket.io handlers: `groupCallJoin`, `groupCallLeave`, `groupCallProduce`, `groupCallConsume`, `groupCallPeerUpdate`
- Group call state in memory (router, transports, producers/consumers)
- FCM push for group call invites

**New `project-js-media-server/`:**
- mediasoup worker (Node.js)
- Router per group call
- WebRTC transport handling
- Optional: recording, RTMP streaming

**Infrastructure:**
- SFU server needs UDP ports (mediasoup)
- Separate VPS or container for media server
- TURN server already configured for 1:1, reused for SFU