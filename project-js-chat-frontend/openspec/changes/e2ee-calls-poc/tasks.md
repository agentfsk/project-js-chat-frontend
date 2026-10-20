# Tasks

## 0. Dependencies & Setup

- [x] 0.1 Add `@noble/curves@^1.4.0` and `@noble/hashes@^1.4.0` to `packages/shared/package.json` (verify: `pnpm install` succeeds in shared)
- [x] 0.2 Add `react-native-get-random-values@^2.0.0` to `apps/mobile/package.json` for CSPRNG polyfill (verify: `pnpm install` succeeds in mobile)
- [x] 0.3 Verify `react-native-webrtc` version supports `RTCRtpScriptTransform` polyfill or custom transform (verify: check version `^124.0.8`)

## 1. Shared Crypto Package (`packages/shared/src/crypto/`)

- [x] 1.1 Create `packages/shared/src/crypto/hkdf.ts` with `hkdfExtract`, `hkdfExpand`, `hkdfSHA256` (verify: unit tests match RFC 5869 test vectors)
- [x] 1.2 Create `packages/shared/src/crypto/sframe.ts` with `SFrameEncryptor`, `SFrameDecryptor` classes using AES-GCM (verify: encrypt/decrypt roundtrip with known key/counter)
- [x] 1.3 Create `packages/shared/src/crypto/x3dh.ts` with `generateIdentityKeys`, `generateSignedPreKey`, `generatePreKeyBundle`, `parseKeyPackage`, `computeSharedSecret` (verify: X3DH test vectors from Signal spec)
- [x] 1.4 Create `packages/shared/src/crypto/doubleRatchet.ts` with `DoubleRatchet` class: `initialize`, `ratchetSend`, `ratchetReceive`, `dhRatchet`, `getMessageKey` (verify: Signal Double Ratchet test vectors)
- [x] 1.5 Create `packages/shared/src/crypto/keyStorage.ts` with `IdentityKeyStore`, `PreKeyStore`, `SessionStore` adapters for SecureStore/AsyncStorage (verify: keys persist across app restart)
- [x] 1.6 Create `packages/shared/src/crypto/safetyNumber.ts` with `computeSafetyNumber`, `formatSafetyNumber`, `generateQRData` (verify: same fingerprint on both sides)
- [x] 1.7 Create `packages/shared/src/crypto/index.ts` re-exporting all crypto APIs (verify: `import { DoubleRatchet } from '@messenger/shared/crypto'` works)
- [ ] 1.8 Add crypto tests: `packages/shared/src/crypto/*.test.ts` (verify: `pnpm test` passes all vectors)

## 2. Shared WebRTC Integration

- [x] 2.1 Update `packages/shared/src/types.ts`: add `KeyPackage`, `PreKeyBundle`, `E2EEContext`, `SafetyNumber` types (verify: TypeScript compiles)
- [x] 2.2 Update `packages/shared/src/socket.ts`: extend `CallOfferPayload`, `CallAnswerPayload` with `keyPackage`; add `emitCallOffer`, `emitCallAnswer` with key package (verify: types compile, signaling works)
- [x] 2.3 Update `packages/shared/src/callManager.ts`: in `startCall` generate key package, pass to `emitCallOffer`; in `accept` parse peer key package, initialize Double Ratchet, create E2EE context (verify: call establishes E2EE session)
- [x] 2.4 Update `packages/shared/src/webrtc.rn.ts` `CallEngine`: add `encryptionContext` constructor param; wrap `addTrack` sender with SFrame encrypt transform; wrap `ontrack` receiver with SFrame decrypt transform (verify: encrypted frames sent, decrypted frames received)
- [x] 2.5 Create `packages/shared/src/e2ee.ts` with `createE2EEContext(callId, isInitiator, localKeyPackage, remoteKeyPackage)` returning `{ encryptor, decryptor, ratchet, safetyNumber }` (verify: context created, keys derived)

## 3. Mobile App (`apps/mobile`)

- [x] 3.1 Create `apps/mobile/src/services/e2ee.ts`: `initializeIdentityKeys()`, `rotatePreKeys()`, `getKeyPackage()`, `storeSession()` (verify: keys generated on first login, persisted in SecureStore)
- [x] 3.2 Update `apps/mobile/src/screens/CallIncomingScreen.tsx`: parse `keyPackage` from route params (from push), pass to `accept()` (verify: offline callee can answer with E2EE)
- [x] 3.3 Update `apps/mobile/src/screens/CallActiveScreen.tsx`: add E2EE indicator (🔒), Safety Number button, verified contact badge (verify: UI shows indicator when E2EE active)
- [x] 3.4 Create `apps/mobile/src/components/SafetyNumberModal.tsx`: display 5×4 digit groups, QR code, "Verified" toggle (verify: modal opens, QR scans, verification persists)
- [x] 3.5 Update `apps/mobile/src/providers/AuthProvider.tsx`: call `initializeIdentityKeys()` and `rotatePreKeys()` on login (verify: pre-keys uploaded to backend on login)
- [x] 3.6 Update `apps/mobile/src/config.ts`: add `E2EE_ENABLED` feature flag (verify: flag controls E2EE code paths)

## 4. Web Frontend (`project-js-chat-frontend`)

- [x] 4.1 Update `project-js-chat-frontend/src/webrtc.ts` `CallEngine`: add `encryptionContext`; implement `RTCRtpScriptTransform` for sender (SFrame encrypt) and receiver (SFrame decrypt) (verify: Chrome/Edge calls encrypt/decrypt frames)
- [x] 4.2 Update `project-js-chat-frontend/src/callManager.ts`: key package generation/exchange same as mobile (verify: web ↔ mobile E2EE call works)
- [x] 4.3 Create `project-js-chat-frontend/src/components/SafetyNumberModal.tsx` (shared design with mobile) (verify: modal works in browser)
- [ ] 4.4 Update `project-js-chat-frontend/src/api/auth.ts`: add `uploadPreKeys()`, `fetchKeyBundle(userId)` (verify: keys sync with backend)

## 5. Backend (`project-js-chat-backend`)

- [x] 5.1 Update `project-js-chat-backend/src/routes.js`: add `GET /api/v1/keys/bundle/:userId` returning identity key, signed pre-key, OPKs (verify: endpoint returns valid bundle)
- [x] 5.2 Update `project-js-chat-backend/src/routes.js`: add `POST /api/v1/keys/prekeys` (auth) to upload signed pre-key + OPK batch (verify: keys stored, consumed on use)
- [x] 5.3 Update `project-js-chat-backend/src/routes.js`: add `POST /api/v1/keys/identity` (auth) for identity key rotation (verify: rotation triggers Safety Number change)
- [x] 5.4 Update `project-js-chat-backend/src/routes.js` socket handlers: pass `keyPackage` through in `callOffer`/`callAnswer`/`callSignal` (verify: key package reaches callee)
- [x] 5.5 Update `project-js-chat-backend/src/fcm.js`: include `keyPackage` in `sendCallPush` payload (verify: offline push contains key package)
- [x] 5.6 Update user model in memory: add `identityKey`, `signedPreKey`, `preKeys[]`, `preKeySignatures[]` fields (verify: user object has crypto fields)

## 6. Integration & Testing

- [ ] 6.1 Test mobile ↔ mobile audio call with E2EE (verify: call connects, audio clear, Safety Number matches, 🔒 shown)
- [ ] 6.2 Test mobile ↔ mobile video call with E2EE (verify: video works, frame encryption/decryption, no artifacts)
- [ ] 6.3 Test mobile ↔ web (Chrome) E2EE call (verify: cross-platform E2EE works, Safety Number matches)
- [ ] 6.4 Test offline callee: kill app → call → push received → answer → E2EE established (verify: key package from push works)
- [ ] 6.5 Test fallback: call to legacy client (no key package) → DTLS-only with warning (verify: warning shown, call works)
- [ ] 6.6 Test Safety Number verification: verify contact → persistent indicator on next calls (verify: indicator persists)
- [ ] 6.7 Test key rotation: rotate identity key → Safety Number changes → warning on next call (verify: rotation detected)
- [ ] 6.8 Test reconnect: disconnect network during call → reconnect → E2EE session resumes (verify: ratchet sync works)
- [ ] 6.9 Load test: 10 concurrent E2EE calls (verify: no memory leaks, CPU acceptable)

## 7. Build & Release

- [ ] 7.1 Build shared package: `cd packages/shared && pnpm build` (verify: `dist/` has crypto modules)
- [ ] 7.2 Build mobile: `eas build -p android --profile preview` (verify: APK includes crypto, installs)
- [ ] 7.3 Deploy backend to Render with new endpoints (verify: endpoints respond, FCM works)
- [ ] 7.4 Full regression: messaging, groups, calls (E2EE + legacy), push notifications (verify: all features work)
