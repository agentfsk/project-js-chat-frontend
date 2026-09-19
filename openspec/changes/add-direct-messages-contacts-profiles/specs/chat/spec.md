# Spec Delta

## MODIFIED Requirements

### Requirement: Deliver attachment in real time
The system SHALL deliver attachment metadata with the message without a page refresh to the participants of the channel: to every connected participant for public channels, and only to the two participants for private channels.

#### Scenario: Attachment broadcast
- **WHEN** a message with an attachment is sent to a channel
- **THEN** the message and its attachment metadata appear in that channel for every connected participant

#### Scenario: Attachment delivered only to the pair in a private channel
- **WHEN** a message with an attachment is sent to a private channel
- **THEN** the message and its attachment metadata appear in that channel only for the two participants

## ADDED Requirements

### Requirement: Authenticated real-time connections
The system SHALL require a valid token on every socket connection and SHALL deliver events only for channels the connected user can access: public channels for everyone, private channels only for their two participants. A connection without a valid token SHALL be rejected.

#### Scenario: Connection with a valid token
- **WHEN** the user connects with a valid token
- **THEN** the socket is accepted and real-time events flow

#### Scenario: Connection without a valid token
- **WHEN** a socket connects without a valid token
- **THEN** the connection is refused and no events are exchanged

#### Scenario: Private events are scoped to participants
- **WHEN** a channel event or message concerns a private channel
- **THEN** only the sockets of its two participants receive the event

### Requirement: Chat data is scoped to the current user
The system SHALL return to the user only the channels they can access (all public channels and their own private channels) together with that user's messages, own profile, contacts, and pending contact requests.

#### Scenario: Private channels of others are hidden
- **WHEN** the user loads the chat data
- **THEN** private channels the user does not participate in are not returned

#### Scenario: Own private channels are included
- **WHEN** the user loads the chat data
- **THEN** the user's own private channels and their messages are returned alongside the public channels