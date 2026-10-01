# Design

## Context

See proposal.md - Why. Current state: React/Vite web frontend (`project-js-chat-frontend`) + Fastify/Socket.io backend (`project-js-chat-backend`). Building native Android app in `project-js-android/` using Expo/React Native with maximum code reuse via shared package.

Key constraints:
- Backend runs on Render (no UDP) → need external TURN server
- APK distributed from website (Vercel frontend) → EAS Build preview profile (APK)
- No email in registration → username + password only
- FCM for push notifications (incoming calls when offline)
- Target: Android first, iOS later (RN enables portability)

## Goals / Non-Goals

**Goals:**
- Full feature parity with web: messaging, groups, calls, reactions, replies, attachments, unread indicators
- Native WebRTC via `react-native-webrtc` (reliable audio/video/screen-share)
- FCM push for incoming calls (FullScreenIntent on lock screen)
- Offline-capable: persisted stores, background socket, optimistic updates
- Code reuse: shared types, API, stores, socket logic, call manager between web and mobile
- Signed APK hosted on GitHub Releases / Firebase App Distribution

**Non-Goals:**
- iOS build (later, separate EAS profile)
- Custom native modules beyond `react-native-webrtc` / `expo-notifications`
- Advanced call features (recording, blur background, virtual backgrounds)
- Message search, message threads beyond replies
- End-to-end encryption

## Decisions

### 1. Monorepo Structure (pnpm workspaces)

```
project-js-android/
├── pnpm-workspace.yaml
├── apps/mobile/          # Expo app
└── packages/shared/      # Reusable logic (TS, builds to dist/)
```

**Rationale:** Clear separation, shared package publishable to npm later, web can migrate to import from `@messenger/shared`.

### 2. Shared Package Exports

```json
{
  "exports": {
    ".": "./dist/index.js",
    "./types": "./dist/types.js",
    "./api": "./dist/api/index.js",
    "./store": "./dist/store/index.js",
    "./socket": "./dist/socket.js",
    "./callManager": "./dist/callManager.js",
    "./webrtc": "./dist/webrtc.rn.js",
    "./utils": "./dist/utils/index.js"
  }
}
```

**Rationale:** Tree-shaking, explicit imports, web can alias `@shared/*` to local copy during transition.

### 3. Storage Adapter Pattern

`packages/shared/src/storage.ts`:
```ts
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

// Web: localStorage | Mobile: AsyncStorage | SecureStore (for tokens)
```

**Rationale:** Single store implementation, platform-specific adapters. Auth token → `expo-secure-store`, other → `AsyncStorage`.

### 4. Socket.io Adaptation for RN

Polyfills in `socket.ts`:
- `global.Buffer = require('buffer').Buffer`
- `global.process = { env: {} }`
- `global.WebSocket = require('react-native').WebSocket` (or `ws` polyfill)
- Token from storage adapter
- Online/offline via `@react-native-community/netinfo`

**Rationale:** `socket.io-client` works in RN with minimal polyfills. NetInfo replaces `navigator.onLine`.

### 5. WebRTC Engine Port (`webrtc.rn.ts`)

Direct mapping of browser API to `react-native-webrtc`:
| Browser | RN (react-native-webrtc) |
|---------|--------------------------|
| `new RTCPeerConnection(config)` | `new RTCPeerConnection(config)` |
| `navigator.mediaDevices.getUserMedia()` | `mediaDevices.getUserMedia()` |
| `navigator.mediaDevices.getDisplayMedia()` | `RTCPeerConnection.getDisplayMedia()` (Android 10+) |
| `pc.ontrack`, `onicecandidate`, `onnegotiationneeded` | Same events |
| `MediaStream`, `MediaStreamTrack` | Same classes |

**ICE Servers:**
```ts
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: `turn:${TURN_IP}:3478?transport=udp`, username: TURN_USER, credential: TURN_PASS },
  { urls: `turn:${TURN_IP}:5349?transport=tcp`, username: TURN_USER, credential: TURN_PASS },
];
```

**Rationale:** `react-native-webrtc` API is nearly identical to browser. TURN required for mobile NAT traversal (Render has no UDP).

### 6. CallManager Port

`callManager.ts` imports `CallEngine` from `./webrtc.rn` instead of `./webrtc`. All state logic (calling/ringing/active/ended), timeouts, signal queue, polite/impolite negotiation — unchanged.

**Rationale:** Business logic is platform-agnostic. Only engine implementation differs.

### 7. Navigation Architecture

```
RootNavigator
├── AuthStack (Login, Signup)
├── MainTabs (Chats, Contacts, Settings)
│   ├── ChatsStack (ChatList, ChatScreen, Modals)
│   ├── ContactsStack (Contacts, Search, Profile)
│   └── SettingsStack
└── CallStack (modal, transparent)
    ├── CallIncomingScreen
    └── CallActiveScreen
```

**CallStack as modal:** Allows call UI to overlay any tab, persists during navigation. `presentation: 'transparent'` for incoming call overlay.

### 8. FCM Integration

**Backend (`project-js-chat-backend`):**
- `POST /api/v1/push-token` → saves `user.fcmToken`
- In `callOffer`: if callee offline (`calleeRoom.size === 0`) → `sendCallPush(fcmToken, callData)`

**FCM Payload (data message):**
```json
{
  "data": {
    "type": "callIncoming",
    "callId": "uuid",
    "channelId": "123",
    "mode": "video",
    "peerId": "456",
    "peerName": "Ivan",
    "peerAvatar": "https://..."
  },
  "android": { "priority": "high", "notification": { "title": "Входящий вызов", "body": "Ivan звонит..." } }
}
```

**Mobile:**
- `expo-notifications` + `google-services.json`
- `registerForPushNotifications()` on login → send token to backend
- `NotificationResponseListener`: parse `data` → navigate to `CallIncomingScreen`
- Android: `expo-notifications` config with `channelId` + `FullScreenIntent` → system launches `CallIncomingScreen` on lock screen

### 9. Offline Support

- **Persisted stores**: `zustand` middleware → `AsyncStorage` (MMKV for performance)
- **Background socket**: `react-native-background-task` (Android) keeps WS alive ~30s; FCM covers longer gaps
- **Optimistic updates**: Messages sent immediately to UI, confirmed by server ack
- **Outbox queue**: Failed sends (no network) → retry on reconnect

### 10. TURN Server (Free Tier)

**Oracle Cloud Free Tier:** 4 ARM CPUs, 24GB RAM, 10TB egress/month. Always Free.

**coturn Docker:**
```bash
docker run -d --name coturn --network host --restart unless-stopped \
  instrumentisto/coturn \
  -n -v -r "messenger" \
  -u "turnuser:turnpass" \
  -p 3478:3478 -p 5349:5349 \
  --external-ip=YOUR_VPS_IP \
  --min-port=49152 --max-port=65535
```

**Rationale:** No cost, reliable UDP/TCP, sufficient for MVP. Alternative: Twilio TURN (pay-per-minute).

### 11. Build & Distribution

- **EAS Build**: `preview` profile → APK (not AAB), `production` → AAB for Play Store later
- **Keystore**: EAS Credentials (generate or upload existing)
- **Hosting**: GitHub Releases (public repo) or Firebase App Distribution
- **Website**: `/download` page with direct APK link + QR code
- **OTA Updates**: `expo-updates` for JS fixes without rebuild

### 12. Package Name

`com.messenger.chat` (configurable via `app.json` `android.package`)

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| TURN connection fails on some carriers | Test on multiple networks (WiFi, 4G, 5G); fallback to TCP TURN port 5349 |
| FullScreenIntent blocked on Android 14+ | Exact permissions (`FOREGROUND_SERVICE_MICROPHONE`, `POST_NOTIFICATIONS`), test on API 34 device |
| Socket dies in background > 30s | FCM data message wakes app; `react-native-background-task` extends to ~10min |
| `react-native-webrtc` build failures | Pin versions: `react-native-webrtc@124.0.6`, `expo@51`, NDK 26, AGP 8.1 |
| APK too large (>100MB) | `expo-dev-client` only for dev; production build strips Hermes bytecode |
| Push token rotation not handled | Re-register token on each app start; backend overwrites old token |
| No email for password recovery | Non-goal for MVP; can add email field later without breaking username auth |

## Open Questions

1. **MMKV vs AsyncStorage** — MMKV faster but needs native module. Start with AsyncStorage, migrate if needed.
2. **Background socket on iOS** — Not in scope (Android first), but VoIP push needed for iOS later.
3. **Coturn TURN credentials rotation** — Static for MVP; rotate via env vars later.
4. **APK auto-update mechanism** — `expo-updates` covers JS; native updates require new APK install. Acceptable for MVP.