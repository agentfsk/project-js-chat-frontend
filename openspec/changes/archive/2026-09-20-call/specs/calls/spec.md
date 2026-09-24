# Spec Delta

## Purpose

Lets two users of a private chat talk in real time: starting a voice or video call, receiving and answering incoming calls, conducting calls with microphone, camera and screen sharing, and being told when a call cannot connect.

## ADDED Requirements

### Requirement: Start a voice or video call from a private chat
The system SHALL let a user start a voice or a video call from any private one-to-one chat, and SHALL NOT offer calling from shared channels.

#### Scenario: Start a voice call
- **WHEN** the user activates the voice call action in a private chat
- **THEN** an outgoing voice call to the peer starts and the caller UI shows the call ringing

#### Scenario: Start a video call
- **WHEN** the user activates the video call action in a private chat
- **THEN** an outgoing video call to the peer starts and the caller UI shows the call ringing

#### Scenario: Calling is not offered in shared channels
- **WHEN** the user opens a shared channel
- **THEN** no call action is offered

### Requirement: Receive and answer an incoming call
The system SHALL notify the recipient of an incoming call in real time, SHALL present accept and decline actions with a ringing tone, SHALL join both participants to the call when the recipient accepts, and SHALL stop ringing when the call ends.

#### Scenario: Incoming call is presented
- **WHEN** a user's peer starts a call in their private chat
- **THEN** the recipient sees an incoming-call prompt with accept and decline actions, regardless of the chat currently open, and a ringing tone plays

#### Scenario: Accept the call
- **WHEN** the recipient accepts the incoming call
- **THEN** the call becomes active for both participants and the caller is notified

#### Scenario: Decline the call
- **WHEN** the recipient declines the incoming call
- **THEN** the call ends, the ringing stops, and the caller is notified that the call was declined

### Requirement: Conduct an active call with media controls
The system SHALL exchange audio and, when enabled, video between the two participants in real time during an active call, SHALL let either participant mute and unmute the microphone, SHALL let either participant turn their camera on and off, SHALL keep the call available while the user navigates the messenger, and SHALL end the call for both participants when either one hangs up.

#### Scenario: Two-way media flows
- **WHEN** the call is active
- **THEN** both participants hear each other's audio and, when their camera is enabled, see each other's video in real time

#### Scenario: Mute the microphone
- **WHEN** a participant mutes their microphone
- **THEN** their audio is no longer transmitted to the peer and the muted participant sees the muted state

#### Scenario: Turn the camera off and on
- **WHEN** a participant turns off their camera during a call
- **THEN** the peer sees a placeholder instead of that participant's video, and turning the camera back on resumes video for the peer

#### Scenario: Hang up from either side
- **WHEN** either participant hangs up
- **THEN** the call ends for both participants and the call UI closes

#### Scenario: Call continues while navigating
- **WHEN** a participant switches to a different chat or channel during a call
- **THEN** the call keeps running and its controls remain available

### Requirement: Share a screen during a call
The system SHALL let either participant share their screen during an active call, SHALL present the sharer with a choice of the whole screen, a window, or a browser tab, SHALL show the shared screen to the peer instead of the sharer's camera, and SHALL let the sharer stop the share at any time.

#### Scenario: Start a screen share
- **WHEN** a participant chooses to share their screen during an active call
- **THEN** a screen choice (full screen, window, or tab) is presented, and after selection the peer sees the shared content

#### Scenario: Screen replaces the camera
- **WHEN** a participant is sharing their screen
- **THEN** the peer sees the shared screen instead of that participant's camera

#### Scenario: Stop a screen share
- **WHEN** the sharer stops the screen share
- **THEN** the sharing stops, the sharer's camera (if enabled) is shown again, and the peer no longer sees the screen

#### Scenario: Two participants share at the same time
- **WHEN** the second participant starts sharing while the first is already sharing
- **THEN** the peer sees the second participant's screen

### Requirement: Report when a call cannot connect
The system SHALL inform the caller when a call cannot connect or is not answered: when the peer is offline, when the peer is already in another call, or when the call is not answered within the ringing timeout, SHALL not deliver a call to an offline peer, and SHALL notify the caller when the peer declines.

#### Scenario: Peer is offline
- **WHEN** the caller starts a call with a peer who is offline
- **THEN** the call ends immediately and the caller is informed that the peer is not available

#### Scenario: Peer is busy
- **WHEN** the caller starts a call with a peer who is already in another call
- **THEN** the call ends immediately and the caller is informed that the peer is busy

#### Scenario: No answer within the timeout
- **WHEN** the peer does not accept within the ringing timeout
- **THEN** the call ends and the caller is informed that there was no answer

#### Scenario: Peer declines
- **WHEN** the peer declines an incoming call
- **THEN** the caller is informed that the peer declined the call