# Design

## Context

See proposal.md - Why. Current state: 1:1 WebRTC calls with Double Ratchet + SFrame E2EE. Shared package contains `CallEngine`, `callManager`, signaling via Socket.io. Backend handles signaling, FCM push. Mobile uses Expo/React Native with `react-native-webrtc`. Web uses `RTCRtpScriptTransform` for E2EE.

Key constraints:
- SFU (mediasoup) required for group calls — P2P mesh doesn't scale beyond 3-4 participants
- MLS required for group E2EE — Double Ratchet doesn't scale for dynamic groups
- Existing 1:1 call infrastructure (Double Ratchet, SFrame) must remain unchanged
- Mobile needs foreground service for background audio
- Web needs `mediasoup-client` for SFU connection
- SFU needs separate VPS with UDP (mediasoup requirement)

## Goals / Non-Goals

**Goals:**
- Group voice/video calls via SFU (mediasoup) with grid/speaker view
- MLS-based E2EE for group calls (replace Double Ratchet for groups)
- Screen sharing in groups
- FCM push for group call invites (offline members)
- Mobile foreground service for background audio
- Integration with existing group channels (owner/admin start call, members join)
- Screen sharing in groups visible to all participants

**Non-Goals:**
- 1:1 call changes (keep existing Double Ratchet + SFrame)
- Recording/streaming (later)
- Breakout rooms, hand-raising, reactions in call (later)
- iOS (later, separate EAS profile)
- Custom native modules beyond mediasoup-client / mls

## Decisions

### 1. SFU: mediasoup (Node.js)

**Rationale:** Industry standard, active maintenance, good TypeScript support, used by Jitsi, Matrix, etc. Handles router, transports, producers/consumers.

**Alternatives considered:**
- Janus — older, less TypeScript-friendly
- Pion (Go) — would need separate Go service, more complex deployment
- Custom P2P mesh — doesn't scale, excluded by requirements

**Architecture:**
```
project-js-media-server/
├── src/
│   ├── worker.ts          # mediasoup worker process
│   ├── router.ts          # per-group-call router
│   ├── transport.ts       # WebRTC transport handling
│   ├── producer.ts        # producer management
│   ├── consumer.ts        # consumer management
│   └── signaling.ts       # Socket.io integration
├── package.json
└── tsconfig.json
```

### 2. MLS Library: @openmls/rust (WASM)

**Rationale:** Official MLS implementation, active development, WASM works in browser and React Native (via JSI). Pure JS `mls-ts` is slower and less audited.

**Alternatives considered:**
- `mls-ts` — pure TS, slower, less tested
- Custom Double Ratchet for groups — doesn't provide MLS benefits (ratchet tree, efficient group ops)

**Integration:**
- Shared package: `mls.ts` wrapper around `@openmls/rust`
- Key storage: identity keys in SecureStore/IndexedDB, group state in AsyncStorage/localStorage
- Welcome messages passed via signaling for late joiners

### 3. Signaling: Extended Socket.io events

**New events:**
| Event | Direction | Payload |
|-------|-----------|---------|
| `groupCallCreate` | Client→Server | `{ channelId, mode }` |
| `groupCallCreated` | Server→Client | `{ callId, routerRtpCapabilities, iceServers }` |
| `groupCallJoin` | Client→Server | `{ callId, rtpCapabilities }` |
| `groupCallJoined` | Server→Client | `{ peers: PeerInfo[] }` |
| `groupCallLeave` | Client→Server | `{ callId }` |
| `groupCallPeerUpdate` | Server→All | `{ callId, peerId, joined: boolean }` |
| `groupCallProduce` | Client→Server | `{ callId, kind, rtpParameters, appData }` |
| `groupCallConsume` | Client→Server | `{ callId, producerId, rtpCapabilities }` |
| `groupCallConsumerUpdate` | Server→Client | `{ callId, consumerId, producerId }` |
| `groupCallMLSMessage` | Client↔Server | `{ callId, epoch, content }` |

**Existing events reused:** `callEnded` for group call end (reason: `group-ended`)

### 3. Signaling: Extended Socket.io events

**New events:**
| Event | Direction | Payload |
|-------|-----------|---------|
| `groupCallCreate` | Client→Server | `{ channelId, mode }` |
| `groupCallCreated` | Server→Client | `{ callId, routerRtpCapabilities, iceServers }` |
| `groupCallJoin` | Client→Server | `{ callId, rtpCapabilities }` |
| `groupCallJoined` | Server→Client | `{ peers: PeerInfo[] }` |
| `groupCallLeave` | Client→Server | `{ callId }` |
| `groupCallPeerUpdate` | Server→All | `{ callId, peerId, joined: boolean }` |
| `groupCallProduce` | Client→Server | `{ callId, kind, rtpParameters, appData }` |
| `groupCallConsume` | Client→Server | `{ callId, producerId, rtpCapabilities }` |
| `groupCallConsumerUpdate` | Server→Client | `{ callId, consumerId, producerId }` |
| `groupCallMLSMessage` | Client↔Server | `{ callId, epoch, content }` |

**Existing events reused:** `callEnded` for group call end (reason: `group-ended`)

### 4. Backend Group Call State

**In-memory state (extend existing `state.calls`):**
```js
state.groupCalls = Map<callId, GroupCall>()

GroupCall = {
  callId,
  channelId,
  mode: 'audio' | 'video',
  creatorId,
  router,              // mediasoup Router
  peers: Map<userId, GroupCallPeer>,
  mlsGroup,            // MLS group state (optional, for E2EE)
  createdAt,
}

GroupCallPeer = {
  userId,
  socketId,
  transports: Map<transportId, WebRtcTransport>,
  producers: Map<producerId, Producer>,  // audio, video, screen
  consumers: Map<consumerId, Consumer>,
  mlsMember,           // MLS group member state
}
```

### 4.1 GroupCallEngineConfig with appData

The `GroupCallEngineConfig` now requires an `appData` field for E2EE key management:

```ts
interface GroupCallEngineConfig {
  callId: string
  channelId: number
  mode: 'audio' | 'video'
  userId: string
  displayName: string
  avatarUrl: string | null
  isCreator: boolean
  rtpCapabilities: any
  iceServers: RTCIceServer[]
  appData: { userId: string; isScreenShare?: boolean; source?: string; keyId?: number }
  events: Partial<GroupCallEngineEvents>
}
```

The `createGroupCallEngineConfig` helper (in `GroupCallEngine.ts`) constructs this config with proper `appData`:

```ts
export function createGroupCallEngineConfig(params: {
  callId: string
  channelId: number
  mode: 'audio' | 'video'
  userId: string
  displayName: string
  avatarUrl: string | null
  isCreator: boolean
  rtpCapabilities: any
  iceServers: RTCIceServer[]
  userIdString: string
}): GroupCallEngineConfig {
  const appData = { userId: params.userIdString, isScreenShare: false, source: 'group-call', keyId: 0 }
  
  return {
    callId: params.callId,
    channelId: params.channelId,
    mode: params.mode,
    userId: params.userId,
    displayName: params.displayName,
    avatarUrl: params.avatarUrl,
    isCreator: params.isCreator,
    rtpCapabilities: params.rtpCapabilities,
    iceServers: params.iceServers,
    appData,
    events: {},
  } satisfies GroupCallEngineConfig
}
```

**Fix applied:** The `appData` field is now properly included in `GroupCallEngineConfig` when joining a group call. Previously it was missing from the config passed from `ChatPage.tsx` to `createGroupCallEngine`, causing the type error "Property 'appData' is missing".

### 4. Backend Group Call State

### 5. Mobile Foreground Service

**Rationale:** Android kills background apps after ~30s. Foreground service with `FOREGROUND_SERVICE_MICROPHONE` + `FOREGROUND_SERVICE_CAMERA` permissions keeps audio alive.

**Implementation:**
- `expo-task-manager` + `expo-background-fetch` for service
- Notification with "Active call" + "Leave" action
- Service stopped on call end or explicit leave

### 6. E2EE: MLS replaces Double Ratchet for groups

**Key differences from 1:1:**
| Aspect | 1:1 (Double Ratchet) | Group (MLS) |
|--------|---------------------|-------------|
| Key agreement | X3DH per call | MLS group (ratchet tree) |
| Membership change | N/A | Commit/Welcome messages |
| Key rotation | DH ratchet | Epoch advance |
| Late joiners | N/A | Welcome message |
| Forward secrecy | Per-message ratchet | Per-epoch + per-message |

**Implementation:**
- Shared package: `mls.ts` with `createMLSGroup()`, `processWelcome()`, `commit()`, `encrypt()`, `decrypt()`
- Keys stored in SecureStore (identity) + AsyncStorage (group state)
- SFrame encryption unchanged (uses MLS-derived keys)

### 7. Media Server Deployment

**Oracle Cloud Free Tier (ARM):** 4 CPUs, 24GB RAM, 10TB egress — sufficient for MVP.

**Docker Compose:**
```yaml
services:
  mediasoup:
    image: custom/mediasoup:latest
    network_mode: host
    environment:
      - MEDIASOUP_WORKER_RTC_MIN_PORT=40000
      - MEDIASOUP_WORKER_RTC_MAX_PORT=40100
      - MEDIASOUP_ANNOUNCED_IP=<VPS_IP>
    restart: unless-stopped
```

**Firewall:** UDP 40000-40100 open for WebRTC

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| mediasoup UDP ports blocked on some networks | TURN server fallback (already configured for 1:1), TCP ICE candidates |
| MLS WASM size (~2MB) increases bundle | Dynamic import (`import('@openmls/rust')`) only when group call starts |
| Mobile foreground service killed by OEM battery optimization | Request "Unrestricted" battery permission, show user guide |
| SFU single point of failure | For MVP: single SFU; later: mediasoup multi-worker + load balancer |
| MLS Welcome message size for large groups | Groups limited to 50 members for MVP; larger groups use subgroup MLS |
| Screen sharing on Android 10+ requires `getDisplayMedia` | Use `react-native-webrtc` built-in support; fallback to camera if unavailable |
| Web `mediasoup-client` requires HTTPS/localhost | Dev: `mkcert` for localhost; Prod: Vercel + custom domain with TLS |

## Migration Plan

1. **Deploy media server** to Oracle Cloud (separate repo `project-js-media-server`)
2. **Deploy backend changes** with group call signaling (additive, no breaking changes)
3. **Update shared package** with `GroupCallEngine`, MLS wrapper, group call store
4. **Update mobile app** — group call screen, foreground service, FCM handling
5. **Update web frontend** — `mediasoup-client`, group call screen
6. **Feature flag** `group_calls_enabled` per user/group for gradual rollout
6. **Rollback:** Disable feature flag, SFU can stay running for existing calls

## Open Questions

1. **Max participants per group call:** 50 for MVP? (mediasoup handles 100+, but bandwidth/UI limits)
2. **MLS library choice:** `@openmls/rust` WASM vs `mls-ts`? WASM is faster but adds build complexity. Recommendation: start with `@openmls/rust` via JSI on mobile, WASM on web.
3. **Group call recording:** Out of scope for MVP, but mediasoup supports it. Design router with recording capability from start?
4. **SFU scaling:** Single worker for MVP. Multi-worker needed at ~200 concurrent calls?
5. **Mobile background video:** Foreground service only keeps audio. Video pauses in background — acceptable for MVP?