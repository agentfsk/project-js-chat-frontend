# e2ee-calls Specification

## Purpose

Provides end-to-end encryption for 1:1 WebRTC calls using Double Ratchet key agreement and SFrame per-frame encryption, ensuring only call participants can decrypt audio and video media.

## Requirements

### Requirement: Establish E2EE session via X3DH and Double Ratchet
The system SHALL perform X3DH key agreement using long-term identity keys, signed pre-keys, and one-time pre-keys to derive a shared secret, then initialize a Double Ratchet session for symmetric key derivation.

#### Scenario: Caller initiates E2EE session
- **WHEN** caller starts a 1:1 call
- **THEN** caller generates an ephemeral key pair, fetches callee's pre-key bundle, computes shared secret via X3DH, initializes Double Ratchet sending/receiving chains, and includes key package in callOffer

#### Scenario: Callee accepts and completes E2EE session
- **WHEN** callee receives callOffer with key package
- **THEN** callee computes shared secret via X3DH using caller's ephemeral key, initializes matching Double Ratchet state, and includes key package in callAnswer

#### Scenario: Session keys are derived per ratchet step
- **WHEN** either party sends or receives a media frame
- **THEN** the Double Ratchet advances (DH ratchet on new ephemeral key, symmetric ratchet per frame), deriving unique message keys for each frame

### Requirement: Encrypt and decrypt media frames with SFrame
The system SHALL encrypt outgoing RTP packets using SFrame (AES-GCM) with key ID derived from ratchet step counter, and decrypt incoming packets using the corresponding receiving chain key.

#### Scenario: Outgoing audio frame is encrypted
- **WHEN** local audio track produces an RTP packet
- **THEN** packet is encrypted with SFrame using current sending message key, key ID = sending ratchet step, counter = RTP sequence number

#### Scenario: Incoming video frame is decrypted
- **WHEN** remote video track delivers an encrypted RTP packet
- **THEN** packet is decrypted with SFrame using current receiving message key matching key ID, counter verified against replay window

#### Scenario: Key rotation on DH ratchet step
- **WHEN** a new DH ratchet step occurs (received new ephemeral public key)
- **THEN** receiving chain advances, new message keys derived, old keys erased; sending chain continues until local DH ratchet

#### Scenario: Replay protection
- **WHEN** a packet with a previously seen (key ID, counter) pair arrives
- **THEN** packet is rejected and not delivered to media pipeline

### Requirement: Verify Safety Number for identity authentication
The system SHALL compute a 60-bit Safety Number from both parties' identity key fingerprints, display it as 5 groups of 4 digits plus QR code, and allow users to verify out-of-band.

#### Scenario: Safety Number is displayed during active call
- **WHEN** call becomes active with E2EE established
- **THEN** both participants can open Safety Number modal showing identical 60-bit fingerprint and QR code

#### Scenario: Safety Number changes when identity key rotates
- **WHEN** a participant regenerates their identity key pair
- **THEN** Safety Number changes, and both parties are notified on next call

#### Scenario: Verified contact shows persistent trust indicator
- **WHEN** users verify Safety Number out-of-band and mark contact as verified
- **THEN** future calls with that contact show a persistent verified indicator

### Requirement: Fallback to DTLS-only with warning when E2EE unavailable
The system SHALL allow calls to proceed with DTLS-SRTP only when peer lacks E2EE support, and SHALL display an explicit warning that the call is not end-to-end encrypted.

#### Scenario: Call with legacy client shows warning
- **WHEN** caller initiates call to peer without E2EE support (no key package in signaling)
- **THEN** call proceeds with DTLS-only, caller sees "Not end-to-end encrypted" warning, callee sees same warning on answer

#### Scenario: Call between E2EE-capable clients uses E2EE
- **WHEN** both parties support E2EE and exchange key packages
- **THEN** call uses E2EE, no warning shown, Safety Number available

### Requirement: Offline callee receives key package via FCM push
The system SHALL include caller's key package in FCM push notification for offline callee, enabling E2EE session establishment when callee comes online.

#### Scenario: Offline callee receives call push with key package
- **WHEN** caller calls offline peer
- **THEN** FCM push contains call data plus caller's X3DH key package (identity key, ephemeral key, pre-key ID)

#### Scenario: Callee processes push and answers with matching key package
- **WHEN** callee opens app from push notification
- **THEN** callee derives shared secret from push key package, initializes Double Ratchet, sends callAnswer with own key package