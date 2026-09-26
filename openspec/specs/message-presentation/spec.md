# message-presentation Specification

## Purpose

Defines how a single message is laid out inside a conversation: the author's nickname and the send time sit inside the message bubble, the author's avatar sits outside it, the reader's own messages are mirrored to the right without an avatar or nickname, and consecutive messages from one author are grouped so a repeated identity is not drawn over and over.

## Requirements

### Requirement: Message bubble layout
The system SHALL render every message in a conversation as a bubble that carries the author's nickname at its top edge and the send time at its bottom-right, with the author's avatar rendered outside the bubble at its bottom-left. The nickname SHALL be part of the bubble, and the avatar SHALL NOT be part of the bubble.

#### Scenario: Incoming message shows nickname inside and avatar outside
- **WHEN** a message from another participant is displayed
- **THEN** the nickname appears at the top inside the bubble, the send time at the bottom-right inside the bubble, and the avatar sits outside the bubble on its left at the bottom

#### Scenario: Avatar of a user with a picture
- **WHEN** a displayed message has an author who has set an avatar
- **THEN** the avatar is shown as that picture outside the bubble

#### Scenario: Avatar placeholder without a picture
- **WHEN** a displayed message has an author who has not set an avatar
- **THEN** an initial-based placeholder is shown outside the bubble in place of the picture

#### Scenario: Avatar of a user with a picture in a direct message
- **WHEN** a message is displayed in a direct chat
- **THEN** the author's avatar is shown outside the bubble exactly as it is in a public channel

#### Scenario: The send time is shown for a message
- **WHEN** a message carrying a send time is displayed
- **THEN** its time of day is shown at the bottom-right inside the bubble

#### Scenario: A message without a send time still renders
- **WHEN** a displayed message carries no send time
- **THEN** the bubble is rendered without a time and the rest of the message stays usable

#### Scenario: A long nickname does not displace the bubble content
- **WHEN** a message from an author with a very long nickname carries an attachment on a narrow screen
- **THEN** the nickname is truncated or wrapped inside the bubble and the attachment stays fully visible

### Requirement: Own messages are mirrored to the right
The system SHALL align the reader's own messages to the right of the conversation, distinguish them visually from other participants' messages, and render them without an avatar and without a nickname.

#### Scenario: Own message carries no avatar and no nickname
- **WHEN** a message authored by the reader is displayed
- **THEN** it is shown without an avatar and without a nickname

#### Scenario: Own and other messages are visually distinct
- **WHEN** the conversation contains both the reader's messages and other participants' messages
- **THEN** the reader's messages are aligned to the right and rendered in a different surface from the other participants' left-aligned messages

#### Scenario: Own message still shows its send time
- **WHEN** a message authored by the reader is displayed
- **THEN** the send time is shown at the bottom-right inside its bubble

### Requirement: Group consecutive messages from one author
The system SHALL treat consecutive messages from the same author in the same channel as one group when they are less than five minutes apart, and SHALL draw the identity of that group only once: the nickname on the first message of the group, the avatar on the last message of the group, and the send time on the last message of the group.

#### Scenario: Repeated author is not drawn twice
- **WHEN** two or more messages from the same author follow each other within five minutes
- **THEN** the nickname is shown only on the first message of the group and the avatar only on the last

#### Scenario: A new author starts a new group
- **WHEN** the author of the next message differs from the previous one
- **THEN** that message begins a new group and shows its own nickname and its own avatar

#### Scenario: A long pause starts a new group
- **WHEN** a message from the same author follows the previous one after five minutes or more
- **THEN** that message begins a new group and shows its own nickname

#### Scenario: Grouping applies in direct chats
- **WHEN** consecutive messages from the peer appear in a direct chat within five minutes
- **THEN** they are grouped the same way as in a public channel

#### Scenario: A message without a send time is grouped conservatively
- **WHEN** a message carries no send time and so cannot be placed on a timeline
- **THEN** it is rendered as its own group rather than being merged, and shows its own nickname and avatar
