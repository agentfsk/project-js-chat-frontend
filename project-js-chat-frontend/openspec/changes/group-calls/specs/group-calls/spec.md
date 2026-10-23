# Spec Delta

## Purpose

Enables group voice and video calls in group channels using SFU (mediasoup) for scalable media routing. Supports grid/speaker view, screen sharing, participant management, and integrates with MLS for E2EE.

## ADDED Requirements

### Requirement: Start a group call from a group channel
The system SHALL let a group owner or admin start a group voice or video call from any group channel, and SHALL NOT offer group calls in private 1:1 chats or public channels.

#### Scenario: Start a group voice call
- **WHEN** the group owner activates the voice chat action in a group channel
- **THEN** a group voice call starts, the owner joins as the first participant, and other members see a "Join voice chat" prompt

#### Scenario: Start a group video call
- **WHEN** the group owner activates the video chat action in a group channel
- **THEN** a group video call starts, the owner joins with camera enabled, and other members see a "Join video chat" prompt

#### Scenario: Group call not offered in non-group chats
- **WHEN** the user opens a private 1:1 chat or public channel
- **THEN** no group call action is offered

### Requirement: Join and leave a group call
The system SHALL let group members join an ongoing group call, display the list of current participants, and let participants leave at any time. The call SHALL persist as long as at least one participant remains.

#### Scenario: Join an ongoing group call
- **WHEN** a group member taps "Join voice chat" while a call is active
- **THEN** the member joins the call, their audio/video starts, and other participants see them join

#### Scenario: Leave a group call
- **WHEN** a participant taps the leave button
- **THEN** the participant leaves the call, their media stops, and other participants see them leave

#### Scenario: Call persists with remaining participants
- **WHEN** a participant leaves but others remain
- **THEN** the call continues for remaining participants

#### Scenario: Call ends when last participant leaves
- **WHEN** the last participant leaves the group call
- **THEN** the call ends and the SFU router is cleaned up

#### Scenario: Join includes appData for E2EE key management
- **WHEN** a participant joins a group call
- **THEN** the join config includes appData with userId, isScreenShare, source, and keyId for E2EE key management

### Requirement: Media controls in group call
The system SHALL let each participant mute/unmute microphone, turn camera on/off, and share screen. Screen sharing SHALL replace the participant's camera video for other participants.

#### Scenario: Mute microphone in group call
- **WHEN** a participant mutes their microphone
- **THEN** their audio is no longer transmitted to the SFU, and all other participants see the muted indicator

#### Scenario: Turn camera on/off in group call
- **WHEN** a participant turns off their camera
- **THEN** their video is no longer transmitted, other participants see a placeholder, and turning it back on resumes video

#### Scenario: Screen share in group call
- **WHEN** a participant starts screen sharing
- **THEN** the participant chooses screen/window/tab, and other participants see the shared screen instead of the participant's camera

#### Scenario: Stop screen share
- **WHEN** the sharer stops screen sharing
- **THEN** sharing stops, the participant's camera (if enabled) is shown again

### Requirement: Grid and speaker view
The system SHALL display all participants in a grid layout, highlight the active speaker, and allow switching to speaker view where the active speaker fills the screen.

#### Scenario: Grid view shows all participants
- **WHEN** a group call has multiple participants
- **THEN** all participants are shown in a grid with their video/avatar, name, and mute status

#### Scenario: Active speaker highlighted
- **WHEN** a participant speaks
- **THEN** their grid tile is highlighted with a border/indicator

#### Scenario: Speaker view
- **WHEN** a participant taps a grid tile or uses speaker view toggle
- **THEN** the active speaker's video fills the screen, with other participants in a filmstrip

### Requirement: Participant list and management
The system SHALL show a participant list with mute status, role, and allow the call creator to mute/remove participants.

#### Scenario: Participant list shows all members
- **WHEN** a participant opens the participant list
- **THEN** all current participants are listed with name, avatar, mute status, and role

#### Scenario: Call creator can mute participants
- **WHEN** the call creator mutes a participant
- **THEN** that participant's audio is muted for everyone, and they receive a notification

#### Scenario: Call creator can remove participants
- **WHEN** the call creator removes a participant
- **THEN** that participant is disconnected from the call and receives a "removed" notification

### Requirement: Group call invite via push notification
The system SHALL send FCM push notifications to offline group members when a group call starts, allowing them to join directly from the notification.

#### Scenario: Offline member receives group call invite
- **WHEN** a group call starts and some members are offline
- **THEN** offline members receive an FCM push with "Group call started" and a join action

#### Scenario: Tap push opens group call screen
- **WHEN** an offline member taps the push notification
- **THEN** the app opens directly to the group call screen with join flow