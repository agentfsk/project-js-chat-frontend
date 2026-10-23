# Spec Delta

## MODIFIED Requirements

### Requirement: Start a voice or video call from a private chat
The system SHALL let a user start a voice or a video call from any private one-to-one chat, and SHALL NOT offer calling from shared channels. **Additionally, the system SHALL let a group owner/admin start a group voice/video call from a group channel.**

#### Scenario: Start a voice call
- **WHEN** the user activates the voice call action in a private chat
- **THEN** an outgoing voice call to the peer starts and the caller UI shows the call ringing

#### Scenario: Start a video call
- **WHEN** the user activates the video call action in a private chat
- **THEN** an outgoing video call to the peer starts and the caller UI shows the call ringing

#### Scenario: Calling is not offered in shared channels
- **WHEN** the user opens a shared channel
- **THEN** no call action is offered

#### Scenario: Start a group voice call from group channel
- **WHEN** the group owner/admin activates the voice chat action in a group channel
- **THEN** a group voice call starts in the SFU, the creator joins as first participant, and other members see "Join voice chat" prompt

#### Scenario: Start a group video call from group channel
- **WHEN** the group owner/admin activates the video chat action in a group channel
- **THEN** a group video call starts in the SFU, the creator joins with camera, and other members see "Join video chat" prompt

### Requirement: Receive and answer an incoming call
The system SHALL notify the recipient of an incoming call in real time, SHALL present accept and decline actions with a ringing tone, SHALL join both participants to the call when the recipient accepts, and SHALL stop ringing when the call ends. **For group calls, the system SHALL show a "Join voice/video chat" prompt to all group members when a group call starts.**

#### Scenario: Incoming call is presented
- **WHEN** a user's peer starts a call in their private chat
- **THEN** the recipient sees an incoming-call prompt with accept and decline actions, regardless of the chat currently open, and a ringing tone plays

#### Scenario: Accept the call
- **WHEN** the recipient accepts the incoming call
- **THEN** the call becomes active for both participants and the caller is notified

#### Scenario: Decline the call
- **WHEN** the recipient declines the incoming call
- **THEN** the call ends, the ringing stops, and the caller is notified that the call was declined

#### Scenario: Group call join prompt
- **WHEN** a group call starts in a group the user is a member of
- **THEN** the user sees a "Join voice/video chat" banner/prompt with a join button, regardless of the chat currently open

#### Scenario: Join group call from prompt
- **WHEN** the user taps "Join" on the group call prompt
- **THEN** the user joins the group call in the SFU, their media starts, and other participants see them join

### Requirement: Accept a call reliably
The system SHALL establish media for both directions without requiring a renegotiation to repair the connection, including for signalling events that arrive while the recipient is still being notified of the incoming call. **For group calls, media SHALL be established via the SFU with proper produce/consume negotiation.**

#### Scenario: Incoming call media is not lost before answering
- **WHEN** a video call is delivered to a recipient who has not yet accepted it
- **THEN** the call works in both directions as soon as the recipient accepts, without either participant toggling the camera first

#### Scenario: Group call media established via SFU
- **WHEN** a participant joins a group call
- **THEN** their media is negotiated with the SFU (produce/consume), and they receive media from other participants without renegotiation

### Requirement: Conduct an active call with media controls
The system SHALL exchange audio and, when enabled, video between the two participants in real time during an active call, SHALL let either participant mute and unmute the microphone, SHALL let either participant turn their camera on and off, SHALL keep the call available while the user navigates the messenger, and SHALL end the call for both participants when either one hangs up. **For group calls: media flows via SFU to all participants; any participant can leave without ending the call for others; call persists while at least one participant remains.**

#### Scenario: Two-way media flows
- **WHEN** the call is active
- **THEN** both participants hear each other's audio and, when their camera is enabled, see each other's video in real time

#### Scenario: Media flows from the moment the call becomes active
- **WHEN** a video call becomes active
- **THEN** both participants see each other's video without either participant having to toggle their camera

#### Scenario: Mute the microphone
- **WHEN** a participant mutes their microphone
- **THEN** their audio is no longer transmitted to the peer and the muted participant sees the muted state

#### Scenario: Turn the camera off and on
- **WHEN** a participant turns off their camera during a call
- **THEN** the peer immediately sees a placeholder instead of that participant's video with no frozen last frame, and turning the camera back on reliably resumes video for the peer

#### Scenario: Rapid camera toggling does not break the call
- **WHEN** a participant toggles their camera on and off several times, or both participants toggle their cameras at the same time
- **THEN** the call keeps running, video state stays consistent on both sides, and the video can always be turned back on

#### Scenario: Hang up from either side
- **WHEN** either participant hangs up
- **THEN** the call ends for both participants and the call UI closes

#### Scenario: Call continues while navigating
- **WHEN** a participant switches to a different chat or channel during a call
- **THEN** the call keeps running and its controls remain available

#### Scenario: Group call — leave without ending for others
- **WHEN** a participant leaves a group call
- **THEN** the call continues for remaining participants, the leaving participant's media stops, and others see them leave

#### Scenario: Group call — call persists with at least one participant
- **WHEN** participants leave but at least one remains
- **THEN** the group call continues, SFU router stays alive, and new participants can still join

#### Scenario: Group call — ends when last participant leaves
- **WHEN** the last participant leaves a group call
- **THEN** the call ends, SFU router is cleaned up, and no media flows

### Requirement: Share a screen during a call
The system SHALL let either participant share their screen during an active call, SHALL present the sharer with a choice of the whole screen, a window, or a browser tab, SHALL show the shared screen to the peer instead of the sharer's camera, and SHALL let the sharer stop the share at any time. **For group calls, screen sharing works the same way and is visible to all participants.**

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

#### Scenario: Group call screen share visible to all
- **WHEN** a participant shares their screen in a group call
- **THEN** all other participants see the shared screen instead of that participant's camera

### Requirement: Report when a call cannot connect
The system SHALL inform the caller when a call cannot connect or is not answered: when the peer is offline, when the peer is already in another call, or when the call is not answered within the ringing timeout, SHALL not deliver a call to an offline peer, and SHALL notify the caller when the peer declines. **For group calls, the system SHALL inform the caller if the SFU is unavailable or the group call cannot be created.**

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

#### Scenario: Connection drops during a call
- **WHEN** either participant's connection drops (for example, the page is reloaded or the browser is closed) while a call is ringing or active
- **THEN** the call ends on both sides, the interrupted participant's call UI closes, and the remaining peer is no longer busy so a new call can be started immediately

#### Scenario: Group call SFU unavailable
- **WHEN** a group call is started but the SFU is unreachable
- **THEN** the call fails immediately and the caller is informed that the group call service is unavailable