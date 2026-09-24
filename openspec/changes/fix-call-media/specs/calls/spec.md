# Spec Delta

## MODIFIED Requirements

### Requirement: Conduct an active call with media controls
The system SHALL exchange audio and, when enabled, video between the two participants in real time during an active call, SHALL let either participant mute and unmute the microphone, SHALL let either participant turn their camera on and off, SHALL keep the call available while the user navigates the messenger, and SHALL end the call for both participants when either one hangs up.

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

## ADDED Requirements

### Requirement: Accept a call reliably
The system SHALL establish media for both directions without requiring a renegotiation to repair the connection, including for signalling events that arrive while the recipient is still being notified of the incoming call.

#### Scenario: Incoming call media is not lost before answering
- **WHEN** a video call is delivered to a recipient who has not yet accepted it
- **THEN** the call works in both directions as soon as the recipient accepts, without either participant toggling the camera first

## REMOVED Requirements

None.