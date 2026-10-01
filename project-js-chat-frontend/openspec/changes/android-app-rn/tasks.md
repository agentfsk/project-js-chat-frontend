# Tasks

## 0. Infrastructure Setup

- [ ] 0.1 Create Oracle Cloud Free Tier account and provision ARM VM (verify: VM accessible via SSH)
- [ ] 0.2 Deploy coturn on VM via Docker (verify: `turnuser:turnpass` works with `turnutils_uclient -u turnuser -w turnpass turn:YOUR_IP:3478`)
- [ ] 0.3 Create Firebase project, enable Cloud Messaging, generate `google-services.json` and Service Account Key (verify: files exist)
- [ ] 0.4 Create Expo account, configure EAS project (verify: `eas whoami` shows account)
- [ ] 0.5 Generate or upload keystore to EAS Credentials (verify: `eas credentials` shows keystore for android)
- [ ] 0.6 Add Render environment variables: `FCM_SERVICE_ACCOUNT` (JSON string) (verify: Render dashboard shows variable)

## 1. Project Structure & Shared Package

- [ ] 1.1 Create `project-js-android/pnpm-workspace.yaml` with packages `apps/*` `packages/*` (verify: `pnpm install` works at root)
- [ ] 1.2 Create `packages/shared/package.json` with exports, build script, dependencies (verify: `cd packages/shared && pnpm build` produces `dist/`)
- [ ] 1.3 Create `packages/shared/tsconfig.json` with composite, declaration, paths (verify: `tsc --noEmit` passes)
- [ ] 1.4 Copy `types.ts` from frontend to `packages/shared/src/types.ts` (verify: identical content)
- [ ] 1.5 Copy `utils/*` from frontend to `packages/shared/src/utils/` (verify: all files present, `tsc` passes)
- [ ] 1.6 Create `packages/shared/src/storage.ts` with `StorageAdapter` interface and `createWebStorage`, `createAsyncStorage`, `createSecureStore` implementations (verify: exports work in test import)
- [ ] 1.7 Copy `api/client.ts`, `data.ts`, `auth.ts`, `uploads.ts`, `users.ts` to `packages/shared/src/api/`, adapt `client.ts` to use `StorageAdapter` (verify: `tsc` passes, no `localStorage` references)
- [ ] 1.8 Create `packages/shared/src/api/push.ts` with `registerPushToken(token)`, `updatePushToken(token)` (verify: compiles)
- [ ] 1.9 Copy `store/*` to `packages/shared/src/store/`, adapt `auth.ts` to use `SecureStore` adapter for token (verify: `tsc` passes)
- [ ] 1.10 Copy `socket.ts` to `packages/shared/src/socket.ts`, add polyfills (`Buffer`, `process`, `WebSocket`), use `StorageAdapter` for token, `@react-native-community/netinfo` for online state (verify: compiles, no browser-only APIs)
- [ ] 1.11 Create `packages/shared/src/webrtc.rn.ts` porting `webrtc.ts` to `react-native-webrtc` API (verify: compiles, exports `CallEngine` with same interface)
- [ ] 1.12 Copy `callManager.ts` to `packages/shared/src/callManager.ts`, change import to `./webrtc.rn` (verify: compiles)
- [ ] 1.13 Create `packages/shared/src/index.ts` re-exporting all public APIs (verify: `import { useAuthStore } from '@messenger/shared'` works)
- [ ] 1.14 Build shared package: `cd packages/shared && pnpm build` (verify: `dist/` contains `.js`, `.d.ts`, `package.json`)

## 2. Expo Mobile App Skeleton

- [ ] 2.1 Run `cd apps && npx create-expo-app@latest mobile --template blank-typescript` (verify: `apps/mobile` exists with Expo structure)
- [ ] 2.2 Install dependencies: `expo`, `react-native`, navigation, `socket.io-client`, `zustand`, `react-native-webrtc`, `expo-notifications`, `expo-image-picker`, `expo-document-picker`, `expo-audio`, `expo-secure-store`, `@react-native-community/netinfo`, `@react-native-async-storage/async-storage`, `react-native-get-random-values`, `react-native-gesture-handler`, `react-native-reanimated`, `react-native-screens`, `react-native-safe-area-context` (verify: `pnpm install` succeeds)
- [ ] 2.3 Configure `apps/mobile/tsconfig.json` with paths for `@shared/*` → `../../packages/shared/src` (verify: `import { useAuthStore } from '@shared/store/auth'` resolves)
- [ ] 2.4 Copy `google-services.json` to `apps/mobile/` (verify: file present)
- [ ] 2.5 Configure `apps/mobile/app.json` with: name, scheme, permissions (CAMERA, RECORD_AUDIO, FOREGROUND_SERVICE, POST_NOTIFICATIONS, etc.), plugins (expo-notifications, expo-audio, expo-image-picker, expo-document-picker, react-native-webrtc with enableStaticLib, expo-build-properties), android.package = `com.messenger.chat` (verify: `expo doctor` passes)
- [ ] 2.6 Configure `apps/mobile/eas.json` with `preview` (android.buildType=apk) and `production` (android.buildType=aab) profiles (verify: `eas build:configure` shows profiles)
- [ ] 2.7 Create `apps/mobile/src/navigation/RootNavigator.tsx` with AuthStack, MainTabs, CallStack (modal) (verify: app loads, navigation structure renders)
- [ ] 2.8 Create providers: `AuthProvider`, `SocketProvider`, `ThemeProvider`, `PermissionsProvider` wrapping RootNavigator (verify: context values accessible in screens)
- [ ] 2.9 Implement `useAuth` hook wrapping `useAuthStore` with `initialize()` calling `fetchData()` and `connectSocket()` (verify: login persists, socket connects)
- [ ] 2.10 Implement `usePermissions` hook requesting CAMERA, RECORD_AUDIO, POST_NOTIFICATIONS on demand (verify: permission dialogs appear)

## 3. Authentication Screens

- [ ] 3.1 Create `LoginScreen`: username + password fields, submit → `api.auth.login` → `auth.setSession` → `connectSocket` → navigate to MainTabs (verify: valid credentials log in, invalid show error)
- [ ] 3.2 Create `SignupScreen`: username + password + confirm, submit → `api.auth.signup` (username+password only) → `auth.setSession` → `connectSocket` → navigate to MainTabs (verify: unique username creates account, duplicate shows error)
- [ ] 3.3 Add form validation, loading states, error toasts (verify: UX matches web)

## 4. Chat List & Navigation

- [ ] 4.1 Create `ChatListScreen`: FlatList of channels from `useChatStore`, sorted by `sortByUnread`, showing avatar, name, last message preview, unread badge, pinned indicator (verify: list renders, order matches web)
- [ ] 4.2 Implement `ChannelRow` component with press → `ChatScreen`, long-press → context menu (pin, mute, delete, leave) (verify: interactions work)
- [ ] 4.3 Create `ChatScreen` with `MessageList` (FlatList inverted), `MessageInput` (verify: messages display, input works)
- [ ] 4.4 Wire `MessageList` to `selectActiveChannelMessages`, real-time updates via socket (verify: new messages appear instantly)
- [ ] 4.5 Implement pull-to-refresh for history pagination (verify: older messages load)

## 5. Message Features

- [ ] 5.1 Create `MessageBubble`: body, attachment (image preview / file link), reactions (emoji + count), reply quote, edited/pinned badges, own/other styling (verify: matches web rendering)
- [ ] 5.2 Implement `MessageContextMenu` on long-press: Reply, React, Edit, Delete, Copy (verify: actions trigger correct socket emits)
- [ ] 5.3 Implement `MessageInput`: text, attachment button (image/file), emoji picker, GIF picker, send button (verify: all input types send correctly)
- [ ] 5.4 Attachment upload: `expo-image-picker` / `expo-document-picker` → `FormData` → `api.uploads.uploadFile` → send message with attachment (verify: image preview, file link work)
- [ ] 5.5 Emoji picker: port `EmojiPicker` component using `emojibase-data` (verify: emoji insert works)
- [ ] 5.6 GIF picker: port `GifPicker` using Giphy API (verify: GIF search and send works)

## 6. Groups Functionality

- [ ] 6.1 Create `CreateGroupModal`: name (required), description, avatar picker, member picker (contacts only) → `socket.emitCreateGroup` (verify: group created, appears in list)
- [ ] 6.2 Create `GroupInfoModal`: avatar, name, description, members list with roles, owner actions (invite, edit, delete) (verify: displays correctly)
- [ ] 6.3 Create `InviteMembersModal`: contact picker (owner's contacts only) → `socket.emitInviteToGroup` (verify: invites work)
- [ ] 6.4 Implement member moderation: long-press row → menu per role (owner: mute/kick/promote/demote; admin: mute; member: none) (verify: permissions enforced)
- [ ] 6.5 Mute banner in composer: "Вы заглушены на X:XX" with live countdown (verify: shows when muted, disappears after expiry)
- [ ] 6.6 Delete group: two-step confirmation (Да/Нет → type "Yes") → `socket.emitRemoveGroup` (verify: group removed for all members)

## 7. Contacts & Profiles

- [ ] 7.1 Create `ContactsScreen`: contacts list, search users, incoming/outgoing requests tabs (verify: data loads)
- [ ] 7.2 Implement contact request flow: send → pending → accept/decline → real-time updates (verify: full cycle works)
- [ ] 7.3 Create `ProfileModal` / `EditProfileModal`: username, avatar picker → `api.users.updateMe` (verify: changes persist, propagate via socket)

## 8. WebRTC Calls (Core)

- [ ] 8.1 Verify `packages/shared/src/webrtc.rn.ts` `CallEngine` implementation: `startLocalMedia`, `createOffer`, `acceptIncoming`, `handleSignal`, `setMicEnabled`, `setCamEnabled`, `startScreenShare`, `stopScreenShare`, `teardown`, `getLocalStream` (verify: compiles, interface matches browser)
- [ ] 8.2 Verify `packages/shared/src/callManager.ts` uses RN engine, exports `startCall`, `accept`, `decline`, `hangup`, `toggleMic`, `toggleCam`, `startShare`, `stopShare`, handlers (verify: compiles)
- [ ] 8.3 Create `CallIncomingScreen`: full-screen, caller avatar/name, call type, Accept/Decline buttons, ringtone (`expo-audio`), vibration, wake lock (verify: UI renders, audio plays)
- [ ] 8.4 Configure `expo-notifications` for FullScreenIntent: `androidMode: 'default'`, channel with `importance: 'max'`, `fullScreenIntent: true` (verify: notification opens screen on lock screen)
- [ ] 8.5 Create `CallActiveScreen`: local PiP video, remote fullscreen video, controls (mic, cam, screen share, hangup), connection state indicator (verify: all controls work)
- [ ] 8.6 Implement background socket keepalive: `react-native-background-task` (Android) + socket `pingInterval: 10000`, `reconnection: true` (verify: socket survives 5min background)
- [ ] 8.7 Test call flow: A calls B (both foreground) → ringing → accept → audio/video → hangup (verify: 2 devices, works)

## 9. FCM Push Notifications

- [ ] 9.1 Backend: Add `firebase-admin` to `project-js-chat-backend/package.json` (verify: installs)
- [ ] 9.2 Backend: Create `src/fcm.js` with `initializeApp`, `sendCallPush(token, callData)` (verify: compiles)
- [ ] 9.3 Backend: In `routes.js` `callOffer`, if callee offline → `sendCallPush(callee.fcmToken, callData)` (verify: offline callee gets push)
- [ ] 9.4 Backend: Add `POST /api/v1/push-token` endpoint saving `user.fcmToken` (verify: token persisted)
- [ ] 9.5 Mobile: `services/fcm.ts` with `registerForPushNotifications()` → `getExpoPushTokenAsync()` → `api.push.registerPushToken()` (verify: token sent to backend on login)
- [ ] 9.6 Mobile: `NotificationResponseListener` handling `data.type === 'callIncoming'` → navigate to `CallIncomingScreen` with payload (verify: tap push opens call screen)
- [ ] 9.7 Mobile: Foreground notification handler showing call banner (verify: banner appears when app open)
- [ ] 9.8 Test: Kill app → A calls B → B receives push → FullScreenIntent opens `CallIncomingScreen` → accept → call connects (verify: 2 devices, one killed)

## 10. Offline Support & Polish

- [ ] 10.1 Add `zustand` persist middleware with `AsyncStorage` (or MMKV) for auth, chat, users stores (verify: app restores state on cold start)
- [ ] 10.2 Implement outbox queue: failed sends → retry on socket reconnect (verify: message sent after network restored)
- [ ] 10.3 Handle app state changes: `AppState` listener → mark channels read on foreground, manage socket (verify: unread badges update correctly)
- [ ] 10.4 Settings screen: notifications toggle, theme toggle, logout (verify: settings persist)
- [ ] 10.5 Error boundaries + global error logging (verify: crashes caught, reported)

## 11. Build, Test & Release

- [ ] 11.1 Run `eas build -p android --profile preview` (verify: APK produced in artifacts)
- [ ] 11.2 Download APK, install on test device (verify: installs, opens, logs in)
- [ ] 11.3 Full regression test: messaging, groups, calls (foreground/background/killed), push notifications, offline queue (verify: all features work)
- [ ] 11.4 Upload APK to GitHub Releases (or Firebase App Distribution) (verify: download link works)
- [ ] 11.5 Create `/download` page on Vercel frontend with APK link + QR code (verify: page loads, APK downloads)
- [ ] 11.6 Configure `expo-updates` for OTA JS updates (verify: `expo publish` updates app without rebuild)

## 12. Backend Deployment

- [ ] 12.1 Deploy updated `project-js-chat-backend` to Render with `FCM_SERVICE_ACCOUNT` env var (verify: Render logs show successful start)
- [ ] 12.2 Test backend endpoints: signup (username only), login, push-token, callOffer with offline callee (verify: all return expected responses)