# Spec Delta

## MODIFIED Requirements

### Requirement: Start a voice or video call from a private chat
The system SHALL let a user start a voice or a video call from any private one-to-one chat, and SHALL NOT offer calling from shared channels. Calls SHALL use end-to-end encryption when both participants support it.

#### Scenario: Start a voice call with E2EE
- **WHEN** the user activates the voice call action in a private chat and both participants support E2EE
- **THEN** an outgoing voice call to the peer starts with E2EE established, the caller UI shows the call ringing with E2EE indicator

#### Scenario: Start a video call with E2EE
- **WHEN** the user activates the video call action in a private chat and both participants support E2EE
- **THEN** an outgoing video call to the peer starts with E2EE established, the caller UI shows the call ringing with E2EE indicator

#### Scenario: Calling is not offered in shared channels
- **WHEN** the user opens a shared channel
- **THEN** no call action is offered

### Requirement: Receive and answer an incoming call
The system SHALL notify the recipient of an incoming call in real time, SHALL present accept and decline actions with a ringing tone, SHALL join both participants to the call when the recipient accepts, and SHALL stop ringing when the call ends. Incoming calls SHALL include E2EE key package when caller supports E2EE.

#### Scenario: Incoming call is presented with E2EE key package
- **WHEN** a user's peer starts an E2EE call in their private chat
- **THEN** the recipient sees an incoming-call prompt with accept and decline actions, regardless of the chat currently open, and a ringing tone plays; key package is available for E2EE session establishment

#### Scenario: Accept the call with E2EE
- **WHEN** the recipient accepts the incoming E2EE call
- **THEN** the call becomes active for both participants with E2EE established, the caller is notified, Safety Number verification is available

#### Scenario: Decline the call
- **WHEN** the recipient declines the incoming call
- **THEN** the call ends, the ringing stops, and the caller is notified that the call was declined

### Requirement: Accept a call reliably
The system SHALL establish media for both directions without requiring a renegotiation to repair the connection, including for signalling events that arrive while the recipient is still being notified of the incoming call. E2EE session SHALL be established before media flows.

#### Scenario: Incoming E2EE call media is not lost before answering
- **WHEN** a video call with E2EE is delivered to a recipient who has not yet accepted it
- **THEN** the E2EE session is established from key packages in signaling, the call works in both directions with encrypted media as soon as the recipient accepts, without either participant toggling the camera first

### Requirement: Conduct an active call with media controls
The system SHALL exchange audio and, when enabled, video between the two participants in real time during an active call, SHALL let either participant mute and unmute the microphone, SHALL let either participant turn their camera on and off, SHALL keep the call available while the user navigates the messenger, and SHALL end the call for both participants when either one hangs up. All media SHALL be encrypted end-to-end when E2EE is active.

#### Scenario: Two-way encrypted media flows
- **WHEN** the E2EE call is active
- **THEN** both participants hear each other's audio and, when their camera is enabled, see each other's video in real time; all media is encrypted with SFrame per frame

#### Scenario: Media flows from the moment the call becomes active
- **WHEN** an E2EE video call becomes active
- **THEN** both participants see each other's video without either participant having to toggle their camera; video is encrypted from first frame

#### Scenario: Mute the microphone in E2EE call
- **WHEN** a participant mutes their microphone
- **THEN** their audio is no longer transmitted to the peer (encrypted silence packets may be sent), the muted participant sees the muted state, E2EE session continues

#### Scenario: Turn the camera off and on in E2EE call
- **WHEN** a participant turns off their camera during an E2EE call
- **THEN** the peer immediately sees a placeholder instead of that participant's video with no frozen last frame, and turning the camera back on reliably resumes encrypted video for the peer

#### Scenario: Rapid camera toggling does not break the E2EE call
- **WHEN** a participant toggles their camera on and off several times, or both participants toggle their cameras at the same time
- **THEN** the call keeps running, video state stays consistent on both sides, E2EE session remains valid, video can always be turned back on

#### Scenario: Hang up from either side in E2EE call
- **WHEN** either participant hangs up
- **THEN** the call ends for both participants, the call UI closes, E2EE session is torn down and keys are erased

#### Scenario: E2EE call continues while navigating
- **WHEN** a participant switches to a different chat or channel during an E2EE call
- **THEN** the call keeps running with E2EE intact, its controls remain available

### Requirement: Share a screen during a call
The system SHALL let either participant share their screen during an active call, SHALL present the sharer with a choice of the whole screen, a window, or a browser tab, SHALL show the shared screen to the peer instead of the sharer's camera, and SHALL let the sharer stop the share at any time. Screen share SHALL be encrypted end-to-end when E2EE is active.

#### Scenario: Start a screen share in E2EE call
- **WHEN** a participant chooses to share their screen during an active E2EE call
- **THEN** a screen choice (full screen, window, or tab) is presented, and after selection the peer sees the shared content encrypted with SFrame

#### Scenario: Screen replaces the camera in E2EE call
- **WHEN** a participant is sharing their screen in an E2EE call
- **THEN** the peer sees the shared screen instead of that participant's camera; shared content is encrypted

#### Scenario: Stop a screen share in E2EE call
- **WHEN** the sharer stops the screen share
- **THEN** the sharing stops, the sharer's camera (if enabled) is shown again encrypted, and the peer no longer sees the screen

#### Scenario: Two participants share at the same time in E2EE call
- **WHEN** the second participant starts sharing while the first is already sharing
- **THEN** the peer sees the second participant's screen encrypted

### Requirement: Report when a call cannot connect
The system SHALL inform the caller when a call cannot connect or is not answered: when the peer is offline, when the peer is already in another call, or when the call is not answered within the ringing timeout, SHALL not deliver a call to an offline peer, and SHALL notify the caller when the peer declines. E2EE key package SHALL be included in offline push notification.

#### Scenario: Peer is offline with E2EE push
- **WHEN** the caller starts an E2EE call with a peer who is offline
- **THEN** the call ends immediately and the caller is informed that the peer is not available; key package is sent via FCM push for when peer comes online

#### Scenario: Peer is busy
- **WHEN** the caller starts a call with a peer who is already in another call
- **THEN** the call ends immediately and the caller is informed that the peer is busy

#### Scenario: No answer within the timeout
- **WHEN** the peer does not accept within the ringing timeout
- **THEN** the call ends and the caller is informed that there was no answer

#### Scenario: Peer declines
- **WHEN** the peer declines an incoming call
- **THEN** the caller is informed that the peer declined the call

#### Scenario: Connection drops during an E2EE call
- **WHEN** either participant's connection drops (for example, the page is reloaded or the browser is closed) while an E2EE call is ringing or active
- **THEN** the call ends on both sides, the interrupted participant's call UI closes, the remaining peer is no longer busy so a new call can be started immediately; E2EE session keys are erased
