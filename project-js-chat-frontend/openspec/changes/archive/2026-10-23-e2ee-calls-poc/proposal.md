# Proposal

## Why

The messenger currently has 1:1 WebRTC calls with only transport-layer encryption (DTLS-SRTP). Media flows through the SFU (or P2P mesh) in plaintext, meaning the server operator or anyone with network access can intercept audio/video. End-to-end encryption (E2EE) ensures only call participants can decrypt media, matching privacy expectations of modern messengers (Signal, WhatsApp, Telegram). This PoC implements E2EE for 1:1 calls using Double Ratchet + SFrame, establishing the cryptographic foundation for future group calls.

## What Changes

- **New crypto package** in `packages/shared/src/crypto/`: SFrame encryption, HKDF, Double Ratchet, X3DH key agreement, secure key storage
- **WebRTC integration**: `CallEngine` (web + RN) wraps media tracks with SFrame encrypt/decrypt via `RTCRtpScriptTransform` (web) and JS transform (RN PoC)
- **Signaling extension**: `callOffer`/`callAnswer` carry X3DH key packages for session establishment
- **Backend key endpoints**: `GET /api/v1/keys/bundle/:userId`, `POST /api/v1/keys/prekeys` for pre-key distribution
- **FCM push enhancement**: Offline callee receives key package in push notification
- **UI**: Safety Number verification modal (60-bit fingerprint + QR), E2EE indicator (🔒) in call screen
- **Breaking changes**: None (backward compatible — calls without E2EE fall back to DTLS-only with warning)

## Capabilities

### New Capabilities

- `e2ee-calls`: End-to-end encrypted 1:1 WebRTC calls using Double Ratchet + SFrame. Covers key agreement, per-frame encryption, safety number verification, and key rotation during call.

### Modified Capabilities

- `calls`: Requirements extended to mandate E2EE for 1:1 calls. Existing DTLS-only behavior becomes fallback with explicit user warning.

## Impact

**Frontend (`project-js-chat-frontend`):**
- `src/webrtc.ts`: `RTCRtpScriptTransform` for SFrame encrypt/decrypt
- `src/callManager.ts`: Key package generation/exchange in offer/answer
- `src/components/SafetyNumberModal.tsx`: New component (shared with mobile later)

**Shared (`project-js-android/packages/shared`):**
- New `src/crypto/` module (pure JS, `@noble/curves` + `@noble/hashes`)
- `src/webrtc.ts` / `src/webrtc.rn.ts`: Encryption context integration
- `src/callManager.ts`: X3DH key package handling
- `src/socket.ts` / `src/types.ts`: Signaling types for key packages
- `package.json`: + `@noble/curves`, `@noble/hashes`

**Mobile (`project-js-android/apps/mobile`):**
- `src/screens/CallActiveScreen.tsx`: E2EE indicator, Safety Number button
- `src/screens/CallIncomingScreen.tsx`: Key package from push
- `src/services/e2ee.ts`: Identity key generation, pre-key rotation on login
- `src/components/SafetyNumberModal.tsx`: QR + numeric fingerprint

**Backend (`project-js-chat-backend`):**
- `src/routes.js`: Key bundle endpoints, key package passthrough in signaling
- `src/fcm.js`: Key package in call push payload
- No media path changes (SFU forwards encrypted packets unchanged)
