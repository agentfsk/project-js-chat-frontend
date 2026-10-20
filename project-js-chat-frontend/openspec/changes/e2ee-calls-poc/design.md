# Design

## Context

See proposal.md - Why. Current state: 1:1 WebRTC calls with DTLS-SRTP only (transport encryption). Shared package (`packages/shared`) contains `CallEngine` (web + RN), `callManager`, signaling via Socket.io. Backend (`project-js-chat-backend`) handles signaling, FCM push for offline calls. Mobile app (`apps/mobile`) uses Expo/React Native with `react-native-webrtc`.

Key constraints:
- Pure JS crypto required (no native modules in shared package) → `@noble/curves` + `@noble/hashes`
- RN lacks Insertable Streams API → JS SFrame transform for PoC, TurboModule later
- Web uses `RTCRtpScriptTransform` (Insertable Streams, Chrome/Edge only for PoC)
- SFU (mediasoup) forwards encrypted packets unchanged — no media path changes
- Identity keys stored in SecureStore (mobile) / IndexedDB (web)
- Pre-keys rotated on login + daily background refresh

## Goals / Non-Goals

**Goals:**
- Working E2EE for 1:1 audio/video calls (mobile ↔ mobile, mobile ↔ web)
- Double Ratchet + SFrame (AES-GCM) per-frame encryption
- X3DH key agreement with pre-key bundles
- Safety Number verification (60-bit fingerprint + QR)
- Offline callee receives key package via FCM push
- Fallback to DTLS-only with explicit warning when peer lacks E2EE
- Keys erased on call end / disconnect

**Non-Goals:**
- Group calls E2EE (MLS) — separate change
- Identity key backup / cross-device sync
- Safari support (Insertable Streams not available)
- Hardware-accelerated SFrame on RN (TurboModule) — post-PoC
- Post-compromise security beyond Double Ratchet forward secrecy
- Deniability / message franking

## Decisions

### 1. Cryptographic Primitives: `@noble/curves` + `@noble/hashes`

**Rationale:** Pure TypeScript/JS, no native bindings, works in browser and RN (with `react-native-get-random-values` for CSPRNG). Audited, constant-time implementations. Alternatives considered:
- `libsodium-wasm` — larger bundle, WASM complexity
- `tweetnacl` — older, less maintained
- Web Crypto API — not available in RN without polyfill, inconsistent API

### 2. Key Agreement: X3DH (Signal Protocol)

**Rationale:** Standard for async key agreement. Uses:
- Identity Key (IK): Long-term Ed25519, stored in SecureStore
- Signed Pre-Key (SPK): Medium-term X25519, signed by IK, rotated ~weekly
- One-Time Pre-Keys (OPKs): Batch of X25519, consumed once, replenished on login
- Ephemeral Key (EK): Fresh X25519 per call, sent in callOffer/callAnswer

**Key Package Structure (JSON in signaling):**
```json
{
  "identityKey": "base64(Ed25519 pub)",
  "signedPreKey": {
    "keyId": 123,
    "publicKey": "base64(X25519 pub)",
    "signature": "base64(Ed25519 sig over IK||SPK)"
  },
  "oneTimePreKey": {
    "keyId": 456,
    "publicKey": "base64(X25519 pub)"
  },
  "ephemeralKey": "base64(X25519 pub)"
}
```

### 3. Ratchet: Double Ratchet (Signal)

**Rationale:** Provides forward secrecy and post-compromise security. Each direction has independent sending/receiving chains. DH ratchet on new ephemeral key (received in callAnswer or rekey), symmetric ratchet per frame (HKDF-SHA256).

**Key Derivation:**
```
RootKey = HKDF-SHA256(salt=0, IKM=X3DH_shared_secret)
ChainKey_send = HKDF-SHA256(RootKey, "send")
ChainKey_recv = HKDF-SHA256(RootKey, "recv")

// Per frame (symmetric ratchet)
MessageKey = HKDF-SHA256(ChainKey, "msg")
NextChainKey = HKDF-SHA256(ChainKey, "next")

// DH ratchet (on new remote EK)
RootKey' = HKDF-SHA256(RootKey, DH(local_EK_priv, remote_EK_pub))
```

### 4. Frame Encryption: SFrame (AES-GCM)

**Rationale:** IETF standard for E2EE in group calls, works with SFU. Each frame encrypted independently with unique (keyID, counter).

**SFrame Header (per packet):**
```
Key ID (4 bytes) = ratchet step counter (big-endian)
Counter (4 bytes) = RTP sequence number (big-endian)
```

**Encryption:** AES-GCM-128 with key = MessageKey, nonce = HKDF-SHA256(key, "nonce" || keyID || counter), AAD = empty (or RTP header if needed).

**Why not AES-CTR+HMAC:** AES-GCM provides auth+encrypt in one pass, hardware-accelerated on most CPUs, standard in SFrame.

### 5. WebRTC Integration

**Web (`project-js-chat-frontend/src/webrtc.ts`):**
- `RTCRtpScriptTransform` (Insertable Streams) on sender/receiver
- Sender transform: reads RTP packet → SFrame encrypt → forward
- Receiver transform: reads encrypted packet → SFrame decrypt → forward
- Only works in Chrome/Edge (Insertable Streams). Safari falls back to DTLS-only.

**RN (`packages/shared/src/webrtc.rn.ts`):**
- JS transform: intercept `ontrack` / `addTrack` → wrap track with custom processor
- For PoC: use `RTCRtpScriptTransform` polyfill via `react-native-webrtc` internals or post-process in `ontrack`
- Performance: audio-only first (opus ~64kbps), then video (VP8/H.264 ~1-2Mbps)
- TurboModule for native SFrame later

### 6. Signaling Extension

**Socket events extended:**
- `callOffer`: + `keyPackage` (caller's X3DH bundle)
- `callAnswer`: + `keyPackage` (callee's X3DH bundle)
- `callRekey`: optional, for DH ratchet mid-call (new EK)

**FCM Push Payload (offline callee):**
```json
{
  "data": {
    "type": "callIncoming",
    "callId": "...",
    "channelId": 123,
    "mode": "video",
    "keyPackage": { ...caller key package... }
  }
}
```

### 7. Backend Key Endpoints

**New REST endpoints:**
- `GET /api/v1/keys/bundle/:userId` → returns `{ identityKey, signedPreKey, oneTimePreKeys[] }`
- `POST /api/v1/keys/prekeys` (auth) → upload new signed pre-key + batch of OPKs
- `POST /api/v1/keys/identity` (auth) → rotate identity key (triggers Safety Number change)

**Storage:** User document adds `identityKey`, `signedPreKey`, `preKeys[]`, `preKeySignatures[]`. Pre-keys consumed on use (deleted from bundle).

### 8. Safety Number

**Computation:** `HKDF-SHA256(IK_A || IK_B, "safety-number", 60 bits)` → 5 groups of 4 decimal digits (0000-9999).
**QR Code:** `messenger://verify?fp=<base64(fingerprint)>&user=<username>`.
**Verification:** User marks contact verified → stored locally → persistent indicator in UI.

### 9. Key Storage

| Key Type | Mobile | Web |
|----------|--------|-----|
| Identity Key (Ed25519) | `expo-secure-store` | IndexedDB (encrypted via Web Crypto) |
| Signed Pre-Key (X25519) | AsyncStorage | IndexedDB |
| One-Time Pre-Keys (X25519) | AsyncStorage | IndexedDB |
| Double Ratchet State | AsyncStorage (encrypted) | IndexedDB (encrypted) |

**Rotation:**
- Identity key: manual only (Settings → Security → Rotate Identity)
- Signed Pre-Key: on login + weekly background
- OPKs: replenish to 100 on login, consume 1 per incoming call

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| RN JS SFrame too slow for 720p video | PoC: audio-only first; measure CPU; TurboModule for native AES-GCM if needed |
| Insertable Streams not in Safari | Document limitation; show DTLS-only warning on Safari; track WebKit progress |
| Pre-key exhaustion under high call volume | Replenish batch of 100 on login; monitor via telemetry; server can request upload |
| Identity key loss = Safety Number change + unverified contacts | Warn user before rotation; export/import backup (post-PoC) |
| FCM push size limit (4KB) with key package | Key package ~500 bytes; well under limit |
| Clock skew breaks ratchet sync | Double Ratchet is clock-independent; only frame counter matters |
| Replay attack on packet reordering | SFrame counter = RTP seq num; replay window (64 packets) per keyID |
| Man-in-the-middle without Safety Number verification | Mandatory Safety Number check for "verified" UI; warning for unverified calls |

## Migration Plan

1. **Deploy backend key endpoints** (additive, no breaking changes)
2. **Deploy shared crypto package** (new module, no existing code changes)
3. **Update mobile app** (new E2EE flow, fallback to DTLS)
4. **Update web frontend** (Insertable Streams, Chrome/Edge only)
5. **Roll out gradually** — feature flag `e2ee_calls` per user
6. **Monitor**: call success rate, E2EE adoption, Safety Number verifications
7. **Rollback**: disable feature flag → all calls DTLS-only

## Open Questions

1. **Pre-key batch size:** 100 OPKs per upload? Adjust based on call volume telemetry.
2. **Signed Pre-Key rotation interval:** 7 days? 14 days? Balance security vs. server load.
3. **Safety Number format:** 60-bit (5×4 digits) vs 120-bit (Signal uses 60-bit for pairwise). Keep 60-bit for usability.
4. **Rekey during long calls:** Trigger DH ratchet every N minutes? Or only on network change?
5. **Web fallback UX:** How prominent should "Not E2EE" warning be? Banner vs. modal?
