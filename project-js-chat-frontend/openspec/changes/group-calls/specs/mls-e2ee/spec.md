# Spec Delta

## Purpose

Provides end-to-end encryption for group calls using MLS (Messaging Layer Security). Replaces the Double Ratchet used in 1:1 calls with MLS group key agreement, providing efficient key management for dynamic group membership.

## ADDED Requirements

### Requirement: Establish MLS group for group call
The system SHALL create an MLS group when a group call starts, with the call creator as the initial member. The MLS group SHALL be tied to the group channel ID and persist for the duration of the call.

#### Scenario: Creator initializes MLS group
- **WHEN** a group call starts
- **THEN** the creator generates an MLS group with their identity key, creates a welcome message, and the MLS group state is initialized

#### Scenario: Joining member processes welcome message
- **WHEN** a member joins the group call
- **THEN** they receive the welcome message, process it to derive the group epoch secrets, and join the MLS group

### Requirement: Per-epoch encryption keys for media
The system SHALL derive encryption keys from the MLS group epoch secrets for each media stream. Each participant SHALL encrypt their outgoing media with their sender-specific key, and decrypt incoming media with the corresponding receiver key.

#### Scenario: Encrypt outgoing audio/video
- **WHEN** a participant sends audio or video frames
- **THEN** frames are encrypted with SFrame using the participant's sender key derived from the current MLS epoch

#### Scenario: Decrypt incoming media
- **WHEN** a participant receives encrypted media from another participant
- **THEN** media is decrypted using the sender's key derived from the current MLS epoch

### Requirement: Key rotation on membership change
The system SHALL advance the MLS epoch when members join or leave, generating new encryption keys. All remaining members SHALL update their keys seamlessly without call interruption.

#### Scenario: New member joins — epoch advances
- **WHEN** a new member joins the group call
- **THEN** the MLS group creates a new epoch with a Commit message, all members update their keys, and the new member receives the Welcome message

#### Scenario: Member leaves — epoch advances
- **WHEN** a member leaves the group call
- **THEN** the MLS group creates a new epoch (if not the last member), remaining members update keys, and the leaving member's keys are invalidated

#### Scenario: Key update without membership change
- **WHEN** a participant initiates a key update (periodic rotation)
- **THEN** a new epoch is created, all members rotate keys, and forward secrecy is maintained

### Requirement: MLS integration with SFU
The SFU (mediasoup) SHALL forward encrypted SFrame packets without decrypting them. The SFU SHALL NOT have access to MLS keys or plaintext media.

#### Scenario: SFU forwards encrypted packets
- **WHEN** a participant sends encrypted media to the SFU
- **THEN** the SFU forwards packets to other participants based on consumer subscriptions, without accessing plaintext

### Requirement: Identity verification in group
The system SHALL allow participants to verify each other's identity keys via Safety Numbers (pairwise) or group fingerprint.

#### Scenario: Pairwise safety number verification
- **WHEN** two participants verify each other
- **THEN** they compare Safety Numbers derived from their identity keys

#### Scenario: Group fingerprint display
- **WHEN** a participant opens group call security info
- **THEN** a group fingerprint (derived from all members' identity keys) is displayed for verification