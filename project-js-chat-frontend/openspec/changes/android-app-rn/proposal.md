# Proposal

## Why

The messenger currently exists only as a web application (React/Vite frontend + Fastify/Socket.io backend). Users need a native Android application that can be downloaded directly from the website (APK) with full feature parity: real-time messaging, groups, calls (WebRTC), push notifications for incoming calls/messages, and offline-capable UX. Building with React Native (Expo) maximizes code reuse from the existing frontend (shared types, API, stores, socket logic, call manager) while delivering native WebRTC performance and reliable push notifications via FCM.

## What Changes

- **New Android application** in `project-js-android/apps/mobile` (Expo React Native, TypeScript)
- **Shared package** `project-js-android/packages/shared` extracting all reusable logic from frontend (types, API, Zustand stores, socket.io, callManager, WebRTC engine ported to `react-native-webrtc`)
- **Backend modifications** in `project-js-chat-backend`:
  - Registration changed to **username + password only** (no email)
  - FCM push token registration endpoint (`POST /api/v1/push-token`)
  - Push notifications for incoming calls when callee is offline
  - (Optional) Push for new messages when recipient is offline
- **TURN server** for WebRTC NAT traversal (free tier: Oracle Cloud Free Tier + coturn Docker)
- **EAS Build** configuration for signed APK production, hosted on GitHub Releases / Firebase App Distribution
- **Download page** on existing Vercel frontend with direct APK link + QR code

**Breaking changes**:
- **BREAKING**: `POST /api/v1/signup` no longer accepts `email` field; validates unique username only
- **BREAKING**: `POST /api/v1/login` accepts `identifier` (username) + `password` only

## Capabilities

### New Capabilities

- `android-app`: Native Android application (Expo/React Native) with full feature parity to web
- `push-notifications`: FCM integration for offline call/message delivery
- `webrtc-native`: Native WebRTC via `react-native-webrtc` (replaces browser RTCPeerConnection)
- `offline-support`: Persisted stores, background socket, optimistic updates

### Modified Capabilities

- `user-auth`: Registration/login simplified to username+password only (no email)
- `calls`: Incoming call delivery via FCM push when callee offline; FullScreenIntent on Android for lock-screen answer UI

## Impact

**Frontend (`project-js-chat-frontend`)**:
- No functional changes; code extracted to shared package for reuse
- Future: both web and mobile import from `@messenger/shared`

**Backend (`project-js-chat-backend`)**:
- `src/routes.js`: signup/login logic, new push-token endpoint, FCM send in callOffer
- `src/fcm.js`: new module (Firebase Admin SDK)
- `package.json`: + `firebase-admin`
- Environment: `FCM_SERVICE_ACCOUNT` on Render

**New `project-js-android/`**:
- Monorepo (pnpm workspaces) with `apps/mobile` + `packages/shared`
- Expo config (`app.json`, `eas.json`) with permissions, plugins, build profiles
- React Navigation v6 (Stack + Tabs + Modal for calls)
- `react-native-webrtc` + `expo-notifications` + `expo-image-picker` + `expo-document-picker`
- FCM `google-services.json` + Service Account Key
- Keystore for APK signing (EAS Credentials)

**Infrastructure**:
- TURN server (coturn on Oracle Cloud Free Tier VPS)
- Firebase project (FCM)
- GitHub Releases / Firebase App Distribution for APK hosting