# Spec Delta

## Purpose

Keeps the reader aware of conversations they are not currently looking at: while the application is open, a message arriving in any conversation other than the one on screen raises a transient in-app notice naming the sender, the conversation, and the opening of the message, which the reader can act on to jump straight to that conversation.

## ADDED Requirements

### Requirement: Announce a message that arrives in another conversation
The system SHALL show a transient in-application notice when a message is delivered to a conversation that is not the one currently open, and SHALL NOT show a notice for a message delivered to the conversation already on screen. The system SHALL use in-application notices only and SHALL NOT require, request, or depend on operating-system notification permission.

#### Scenario: Notice for a message in a background conversation
- **WHEN** a message is delivered to a channel or direct chat other than the one currently open
- **THEN** a notice naming that conversation appears without the reader having to switch to it

#### Scenario: No notice for the conversation on screen
- **WHEN** a message is delivered to the conversation currently open
- **THEN** no notice is shown for it

#### Scenario: No notice for the reader's own message
- **WHEN** a message the reader themselves sent is echoed back to a conversation
- **THEN** no notice is shown for it

#### Scenario: No operating-system permission is needed
- **WHEN** the reader uses the application
- **THEN** notices are shown inside the application and the application never asks for notification permission

### Requirement: Notice content
The system SHALL identify in the notice who sent the message, which conversation it was sent to, and the beginning of the message body. For a direct chat the conversation SHALL be named after the peer; for a public channel it SHALL be named with the channel name. A message carrying no text SHALL be described by the kind of its attachment instead of an empty body.

#### Scenario: Notice names the sender and the channel
- **WHEN** a message with a text body arrives in a public channel that is not open
- **THEN** the notice shows the sender's name, the channel name, and the beginning of the message body

#### Scenario: Notice names the peer in a direct chat
- **WHEN** a message arrives in a direct chat that is not open
- **THEN** the notice shows the sender's name and the peer's name, together with the beginning of the message body

#### Scenario: Notice describes an attachment-only message
- **WHEN** a message with no text body but with a GIF or another attachment arrives in a conversation that is not open
- **THEN** the notice describes the attachment kind instead of showing empty text

#### Scenario: Long message body is shortened
- **WHEN** the beginning of the message body is too long to fit the notice
- **THEN** the notice shows a shortened leading fragment of the body and stays within its own bounds

### Requirement: Act on a notice
The system SHALL let the reader open the conversation a notice refers to by activating the notice, and SHALL stop showing that notice once its conversation is opened.

#### Scenario: Activating a notice opens its conversation
- **WHEN** the reader activates a notice
- **THEN** the conversation the notice refers to becomes the open conversation and the message is visible there

#### Scenario: Notice is dismissed when its conversation is opened
- **WHEN** the reader opens the conversation a notice refers to by any means
- **THEN** that notice is no longer shown

### Requirement: Notices expire on their own
The system SHALL hide a notice automatically after it has been shown for a short time, SHALL NOT let notices accumulate without bound, and SHALL keep the conversation itself readable while notices are shown.

#### Scenario: Notice hides itself
- **WHEN** a notice has been shown for a short time and the reader does not act on it
- **THEN** it is hidden automatically

#### Scenario: A burst of messages does not fill the screen
- **WHEN** several messages arrive in a short time
- **THEN** at most a bounded number of notices are shown at once and the conversation remains fully usable
