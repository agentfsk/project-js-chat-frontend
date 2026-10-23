# Tasks

## 0. Media Server Setup (project-js-media-server)

- [x] 0.1 Create `project-js-media-server/` repo with Node.js/TypeScript, mediasoup, socket.io, pnpm workspace (verify: `pnpm install` succeeds)
- [x] 0.2 Add mediasoup v3, @types/mediasoup, socket.io, pino for logging (verify: `pnpm install` succeeds)
- [x] 0.3 Create mediasoup worker process (`src/worker.ts`) with router creation, RTP capabilities (verify: worker starts, logs router capabilities)
- [x] 0.4 Implement WebRTC transport handling (`src/transport.ts`): createWebRtcTransport, connect, ICE/DTLS (verify: transport connects from test client)
- [x] 0.5 Implement producer/consumer management (`src/producer.ts`, `src/consumer.ts`): produce/consume audio/video/screen (verify: producer/consumer created, media flows)
- [x] 0.5 Create signaling handler (`src/signaling.ts`): Socket.io events for groupCallJoin/Leave/Produce/Consume/MLSMessage (verify: events handled, state updated)
- [x] 0.7 Dockerize: Dockerfile, docker-compose.yml with host networking, UDP port range (verify: `docker compose up` starts worker, logs ready)
- [x] 0.8 Deploy to Oracle Cloud Free Tier: ARM VM, docker compose, firewall UDP 40000-40100 (verify: media server accessible, test client connects)

## 1. Backend Integration (project-js-chat-backend)

- [x] 1.1 Extend `src/routes.js` state: add `groupCalls` Map with router, peers, MLS state (verify: server starts, state structure correct)
- [x] 1.2 Add `groupCallCreate` socket handler: validate owner/admin, create SFU router, return rtpCapabilities + iceServers (verify: caller gets router caps, SFU router created)
- [x] 1.3 Add `groupCallJoin` handler: create WebRTC transport for peer, return transport params (verify: joiner gets transport, can connect)
- [x] 1.4 Add `groupCallProduce` handler: create producer on SFU, broadcast `groupCallPeerUpdate` to peers (verify: producer created, other peers notified)
- [x] 1.5 Add `groupCallConsume` handler: create consumer for peer, return consumer params (verify: consumer created, media flows from producer)
- [x] 1.6 Add `groupCallLeave` handler: close transports, remove peer, broadcast leave (verify: peer removed, others notified)
- [x] 1.7 Add `groupCallMLSMessage` handler: relay MLS Commit/Welcome messages to group members (verify: MLS messages relayed)
- [x] 1.8 Add `groupCallPeerUpdate` broadcast: notify all peers when someone joins/leaves (verify: peers receive join/leave events)
- [x] 1.9 Extend FCM `sendCallPush` for group calls: include `type: 'groupCallInvite'`, callId, channelId, mode (verify: offline members receive push with join data)
- [x] 1.10 Add REST endpoint `POST /api/v1/group-calls` for creating group call (owner/admin only) (verify: endpoint returns callId, router caps)

## 2. Media Server (project-js-media-server) - Core Implementation

- [x] 2.1 Implement mediasoup worker with multiple workers for scaling (verify: worker count > 1, load balanced)
- [x] 2.2 Router per group call with proper RTP capabilities (verify: router created, caps returned)
- [x] 2.3 WebRTC transport with ICE/DTLS, UDP/TCP ICE candidates (verify: transport connects from mobile/web)
- [x] 2.4 Producer: audio (opus), video (VP8/H264), screen (VP8) with simulcast (verify: producer created, stats show bitrate)
- [x] 2.5 Consumer: per-peer consumers with RTP forwarding, pause/resume (verify: consumer receives media, pause works)
- [x] 2.8 Handle ICE restarts, DTLS renegotiation (verify: connection survives network change)
- [x] 2.9 Cleanup: router close on last leave, transport/producer/consumer cleanup (verify: resources freed, no memory leaks)

## 3. Shared Package (project-js-android/packages/shared)

- [x] 3.1 Add dependencies: `mediasoup-client` ^3.8, `mls-ts`, `openmls-wasm` (verify: `pnpm install` succeeds)
- [x] 3.2 Create `src/groupCall/` module structure: `GroupCallEngine.ts`, `groupCallStore.ts`, `mls.ts`, `index.ts`
- [x] 3.3 Implement `GroupCallEngine.ts`: mediasoup-client Device, transports, producers, consumers, event handlers (verify: engine connects to SFU, produces/consumes media)
- [x] 3.4 Implement `groupCallStore.ts` (Zustand): participants Map, local tracks, speaking indicators, grid/speaker view state (verify: store updates reactively)
- [x] 3.4 Implement `mls.ts`: MLSGroupManager — createGroup, processWelcome, commit, deriveSFrameKeys, encrypt/decrypt (verify: MLS group created, welcome processed, encrypt/decrypt roundtrip)
- [x] 3.5 Integrate MLS with SFrame: derive SFrame keys from MLS epoch secrets (verify: SFrame encrypt/decrypt with MLS keys)
- [x] 3.5 Update `src/socket.ts`: add group call signaling events (groupCallJoin, groupCallProduce, etc.)
- [x] 3.6 Update `src/types.ts`: add `GroupCallPeer`, `GroupCallState`, `MLSGroupState`, `GroupCallMode` types
- [x] 3.7 Create `src/groupCallEngine.ts`: high-level API `joinGroupCall()`, `leaveGroupCall()`, `toggleMic()`, `toggleCam()`, `startScreenShare()`
- [x] 3.8 Add group call persistence: save/restore MLS group state, group call settings (verify: state survives app restart)
- [ ] 3.9 Export from `src/index.ts`: `GroupCallEngine`, `useGroupCallStore`, `mls`, `groupCall` types
- [x] 3.10 **Fix `createGroupCallEngineConfig` to include `appData` in `GroupCallEngineConfig`** (verify: config passes type check, appData included)

## 4. Mobile App (project-js-android/apps/mobile)

- [ ] 4.1 Add dependencies: `mediasoup-client`, `@openmls/rust` (JSI), `expo-task-manager`, `expo-background-fetch`, `expo-audio` (verify: `pnpm install` succeeds)
- [ ] 4.1 Configure `app.json`: foreground service permissions (`FOREGROUND_SERVICE_MICROPHONE`, `FOREGROUND_SERVICE_CAMERA`), mediasoup-client plugin (verify: `expo doctor` passes)
- [ ] 4.2 Create `src/screens/GroupCallScreen.tsx`: grid view (FlatList), speaker view, participant tiles with video/avatar, mute/cam indicators (verify: screen renders, tiles show)
- [ ] 4.2 Implement grid/speaker view toggle, pinch-to-zoom for speaker view (verify: toggle works, speaker fills screen)
- [ ] 4.3 Create participant tile component: video via `RTCView`, avatar fallback, name, mute/cam/screen icons, speaking indicator (animate on audio level) (verify: tile shows video, indicators update)
- [ ] 4.3 Implement speaking indicator: mediasoup-client audio level observer or WebRTC stats (verify: indicator animates when participant speaks)
- [ ] 4.4 Create `GroupCallEngine` wrapper for mobile: initialize Device, create transports, handle produce/consume, MLS integration (verify: mobile joins group call, media flows)
- [ ] 4.4 Implement `joinGroupCall(callId, channelId, mode)`: get router caps, create Device, create send/receive transports, produce local media (verify: mobile joins, local video shows)
- [ ] 4.5 Implement produce/consume: `produceAudio()`, `produceVideo()`, `produceScreen()`, `consumePeer(peerId)` (verify: media flows to/from SFU)
- [ ] 4.6 Implement MLS integration: on join, process Welcome; on member join/leave, process Commit; derive SFrame keys from MLS epoch (verify: E2EE works, media encrypted)
- [ ] 4.7 Create foreground service (`src/services/foregroundCallService.ts`): `expo-task-manager` task, notification with "Leave" action, audio session management (verify: service runs, audio continues in background)
- [ ] 4.7 Update `src/screens/CallActiveScreen.tsx` reuse for group calls: adapt for multiple participants, add participant list modal (verify: screen works for group calls)
- [ ] 4.8 Create `GroupCallParticipantListModal.tsx`: list all participants with mute/cam status, owner actions (mute/kick) (verify: modal opens, actions work)
- [ ] 4.8 Add group call invite handling: parse FCM push `type: 'groupCallInvite'`, navigate to GroupCallScreen with join flow (verify: tap push opens join screen)
- [x] 4.9 Update `GroupInfoModal.tsx`: add "Start voice chat" / "Start video chat" buttons for owner/admin (verify: buttons visible for owner/admin, hidden for members)
- [ ] 4.10 Add screen share support: `expo-media-library` + `getDisplayMedia` via mediasoup-client (verify: screen share starts, others see shared screen)

## 5. Web Frontend (project-js-chat-frontend)

- [x] 5.1 Add `mediasoup-client` dependency (verify: `pnpm install` succeeds)
- [ ] 5.1 Create `src/groupCall/` module: `GroupCallEngine.ts`, `GroupCallScreen.tsx`, `groupCallStore.ts`, `mls.ts`
- [x] 5.2 Implement `GroupCallEngine.ts`: mediasoup-client Device, transports, produce/consume, event handlers (verify: web joins group call, media flows)
- [x] 5.2 Implement `GroupCallScreen.tsx`: grid view (CSS Grid), speaker view, participant tiles with `<RTCView>` equivalent (video element), mute/cam/screen controls (verify: screen works, grid/speaker toggle)
- [x] 5.3 Implement participant tile: `<video>` element with `srcObject`, mute/cam indicators, name, speaking indicator via audio level (verify: tiles show video, indicators update)
- [x] 5.3 Implement screen sharing: `getDisplayMedia()`, produce screen track, replace video track (verify: screen share works, others see shared screen)
- [ ] 5.4 MLS integration for web: dynamic import `@openmls/rust` (WASM), process Welcome/Commit, derive SFrame keys (verify: E2EE works in browser)
- [x] 5.4 Update `src/socket.ts`: add group call signaling events for web
- [x] 5.5 Update `src/pages/ChatPage.tsx` or group channel: add "Start voice chat" / "Start video chat" for owner/admin (verify: buttons visible for owner/admin)
- [x] 5.5 Add "Join voice/video chat" banner when group call active (verify: banner appears, join navigates to GroupCallScreen)
- [x] 5.6 Create `GroupCallScreen.tsx` route in `App.tsx` (verify: navigation works)
- [x] 5.6 Implement participant list sidebar/modal: list participants, mute/cam status, owner actions (verify: sidebar opens, actions work)
- [x] 5.7 **Fix `handleJoinGroupCall` in `ChatPage.tsx` to include `appData` in `GroupCallEngineConfig`** (verify: config passes type check, appData included)

## 6. E2EE: MLS Integration

- [ ] 6.1 Install `@openmls/rust` via npm (WASM) and configure for JSI on mobile (verify: `import('@openmls/rust')` works)
- [ ] 6.1 Implement `mls.ts` shared: `createMLSGroup()`, `processWelcome()`, `commit()`, `encrypt()`, `decrypt()`, `exportState()`, `importState()`
- [ ] 6.2 Key storage: identity keys in SecureStore/IndexedDB, MLS group state in AsyncStorage/localStorage (verify: keys persist, restore works)
- [ ] 6.2 On group call join: creator creates MLS group, others process Welcome message (verify: all members have same epoch)
- [ ] 6.3 On member join: existing member sends Commit, new member processes Welcome (verify: epoch advances, keys updated)
- [ ] 6.3 On member leave: remaining member sends Commit, epoch advances (verify: leaving member's keys invalidated)
- [ ] 6.4 SFrame key derivation: `hkdfSHA256(epochSecret, 'sframe', 32)` per sender (verify: SFrame encrypt/decrypt with MLS keys)
- [ ] 6.4 Safety Number for groups: pairwise from identity keys + group fingerprint from all identity keys (verify: Safety Numbers match, group fingerprint displayed)

## 7. Integration & Testing

- [ ] 7.1 Test mobile ↔ mobile group call (3+ devices): join, leave, media flows, grid/speaker view (verify: all participants see/hear each other)
- [ ] 7.1 Test mobile ↔ web group call: cross-platform media, E2EE (verify: media flows, E2EE works)
- [ ] 7.2 Test group call invite: kill app → group call starts → push received → join from push (verify: push opens join screen)
- [ ] 7.2 Test screen share in group: mobile shares, web sees; web shares, mobile sees (verify: screen visible to all)
- [ ] 7.3 Test E2EE: verify Safety Numbers match, group fingerprint displayed, media encrypted (verify: no plaintext on SFU)
- [ ] 7.3 Test MLS key rotation: member joins/leaves, epoch advances, keys update seamlessly (verify: media continues without interruption)
- [ ] 7.4 Test foreground service: mobile in background > 5min, audio continues, notification shows (verify: audio continues, notification present)
- [ ] 7.4 Test network change: WiFi → 4G during call, ICE restart, media recovers (verify: media recovers within 5s)
- [ ] 7.5 Load test: 10 concurrent group calls with 5 participants each (verify: SFU CPU < 70%, memory stable)

## 8. Build, Deploy & Release

- [ ] 8.1 Build media server: `docker build -t mediasoup-server .`, push to registry (verify: image runs, health check passes)
- [ ] 8.1 Deploy media server to Oracle Cloud: docker-compose, systemd service, log rotation (verify: server runs, auto-restarts)
- [ ] 8.2 Deploy backend with group call endpoints (verify: endpoints respond, FCM works)
- [ ] 8.2 Build mobile: `eas build -p android --profile preview` (verify: APK installs, group calls work)
- [x] 8.3 Build web: `pnpm build` (verify: dist builds, group call screen loads)
- [ ] 8.3 Feature flag `group_calls_enabled` rollout: 10% → 50% → 100% (verify: rollout works, no regressions)
- [ ] 8.4 Full regression: messaging, 1:1 calls, groups, group calls, push, E2EE (verify: all features work)

## 9. Documentation & Polish

- [x] 9.1 Update README with group call architecture diagram
- [x] 9.1 Document media server deployment (Oracle Cloud, Docker, firewall)
- [x] 9.2 Document MLS key management (backup, rotation, recovery)
- [ ] 9.2 Add group call UI strings to localization files
- [ ] 9.3 Performance tuning: mediasoup worker settings, consumer pause/resume, simulcast layers