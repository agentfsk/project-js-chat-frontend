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
The system SHALL render an attachment according to its type: images as a preview, other supported types as a clickable download link showing the filename and size. An image preview SHALL never exceed the width available to its message and SHALL preserve its aspect ratio. An image preview SHALL occupy its final size from the moment the message is rendered, before the image data has loaded, and the appearance of the image SHALL NOT move any message other than the one it belongs to.

#### Scenario: Image preview
- **WHEN** a received message has an image attachment
- **THEN** the system displays a clickable image preview

#### Scenario: Text file download
- **WHEN** a received message has a non-image attachment
- **THEN** the system displays the filename and size as a download link

#### Scenario: Wide image preview stays inside its message
- **WHEN** a message carries an image attachment wider than the space available to that message
- **THEN** the preview is scaled down to fit within the message, keeps its aspect ratio, and does not overlap neighbouring messages or extend past the message list

#### Scenario: Long sender name does not displace the message content
- **WHEN** a message from a sender with a long name carries an image attachment on a narrow screen
- **THEN** the sender name is truncated with an ellipsis and the image preview remains fully visible inside the message

#### Scenario: A slow-loading image does not displace the conversation
- **WHEN** a message with an image attachment is rendered and the image data has not finished loading
- **THEN** the message already occupies the space the image will need, and no message above or below it changes position

#### Scenario: An image without known dimensions still reserves space
- **WHEN** a message carries an image attachment whose pixel dimensions are unknown
- **THEN** the message reserves a placeholder box before the image loads, so the conversation does not shift when the image appears

#### Scenario: Loading images while reading history do not move the view
- **WHEN** images further up the history finish loading while the reader has scrolled away from the newest message
- **THEN** the reader's position in the conversation is preserved and the view is not moved to the newest message

#### Scenario: Loading images while at the newest message keep it in view
- **WHEN** an image finishes loading in the newest message while the reader is already at the bottom of the conversation
- **THEN** the newest message remains fully visible after the image appears

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

### Requirement: Standard-set message reactions
The system SHALL let any participant of an accessible channel toggle an emoji reaction taken from a fixed standard set on any message in that channel: adding their reaction when it is absent and removing their own reaction when they select the same emoji again. The system SHALL reject a reaction toggle for a message in a channel the requester cannot access.

#### Scenario: React to a message
- WHEN a participant selects a reaction emoji from the standard set on a message in an accessible channel
- THEN the reaction is recorded on the message for that participant with the participant's identity

#### Scenario: Remove own reaction
- WHEN a participant selects the same reaction emoji they already applied to a message
- THEN that participant's reaction of that emoji is removed from the message while other participants' reactions remain

#### Scenario: React to a message in a private channel
- WHEN a participant of a private channel toggles a reaction on a message
- THEN the reaction change is only visible to the two participants of that channel

#### Scenario: Reject reaction outside the accessible channels
- WHEN a user toggles a reaction on a message in a channel they cannot access
- THEN the toggle is rejected with an error and no reaction change is applied

### Requirement: Reactions delivered in real time
The system SHALL deliver every reaction change to the channel in real time as the full updated message without a page refresh: to every connected participant for public channels, and only to the two participants for private channels. No optimistic updates are applied; the client reflects only what the server broadcasts.

#### Scenario: Reaction broadcast to a public channel
- WHEN a participant toggles a reaction in a public channel
- THEN every connected participant of the channel receives the updated message with the new reaction state

#### Scenario: Reaction stays private in a direct chat
- WHEN a participant toggles a reaction in a private channel
- THEN only the two participants receive the updated message, and no other connected user receives it

### Requirement: Reactions included in history
The system SHALL include the current reactions of every message in the message history returned by the data endpoint, so a freshly loading client renders the same reaction state as live participants.

#### Scenario: Reloading shows current reactions
- WHEN a client loads the message history for a channel after reactions were applied
- THEN each message carries its current list of reactions with the same identity and count that live participants see

### Requirement: Reply to a message
The system SHALL let a participant send a message as a reply to a message they can access, storing with the reply a snapshot of the original message including its id, author, text, and optional attachment. The reply SHALL be delivered and stored as a regular message. The system SHALL reject a reply that references a message the sender cannot access, and SHALL scroll the view to the original message when the participant clicks the reply quote.

#### Scenario: Send a reply
- WHEN a participant opens reply mode for an accessible message and sends text
- THEN the message is delivered with a replyTo snapshot of the original (id, author, text, optional attachment) and appears above the reply text as a quote

#### Scenario: Jump to the original message
- WHEN a participant clicks the reply quote of a message
- THEN the view scrolls to the original message being replied to

#### Scenario: Reject reply to an inaccessible message
- WHEN a sender replies to a message in a channel they cannot access
- THEN the reply is rejected with an error and no message is created
