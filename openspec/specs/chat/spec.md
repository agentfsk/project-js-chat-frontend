# chat Specification

## Purpose

Real-time text exchange in channels with file attachments: users send messages that are delivered to all connected participants without a page refresh, and can attach supported files that are uploaded through the backend and rendered inline (images as previews, other types as download links).

## Requirements

### Requirement: Attach a file to a message
The system SHALL let the user attach a file of a supported type to a message, with or without a text body, and upload it through the backend before sending.

#### Scenario: Attach image with text
- **WHEN** the user picks a PNG or JPEG file and types a text body
- **THEN** the message is sent with both the text and the attachment metadata

#### Scenario: Attach a file without text
- **WHEN** the user picks a supported file and leaves the body empty
- **THEN** the message is sent with only the attachment

#### Scenario: Unsupported file type
- **WHEN** the user picks a file whose type is not in the supported list
- **THEN** the system rejects the upload and shows an error without sending the message

#### Scenario: File exceeds the size limit
- **WHEN** the user picks a file larger than the configured limit
- **THEN** the system rejects the upload and shows an error without sending the message

### Requirement: Deliver attachment in real time
The system SHALL deliver attachment metadata with the message without a page refresh to the participants of the channel: to every connected participant for public channels, and only to the two participants for private channels.

#### Scenario: Attachment broadcast
- **WHEN** a message with an attachment is sent to a channel
- **THEN** the message and its attachment metadata appear in that channel for every connected participant

#### Scenario: Attachment delivered only to the pair in a private channel
- **WHEN** a message with an attachment is sent to a private channel
- **THEN** the message and its attachment metadata appear in that channel only for the two participants

### Requirement: Render message attachments
The system SHALL render an attachment according to its type: images as a preview, other supported types as a clickable download link showing the filename and size.

#### Scenario: Image preview
- **WHEN** a received message has an image attachment
- **THEN** the system displays a clickable image preview

#### Scenario: Text file download
- **WHEN** a received message has a non-image attachment
- **THEN** the system displays the filename and size as a download link

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