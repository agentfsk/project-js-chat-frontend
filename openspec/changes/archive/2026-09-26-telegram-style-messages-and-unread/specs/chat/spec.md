# Spec Delta

## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Avatar next to the nickname in the message header
**Reason**: The avatar is no longer placed inside a message header beside the nickname. The nickname moved into the message bubble, the avatar sits outside the bubble, and the reader's own messages carry neither — behaviour that is now specified by the `message-presentation` capability.

**Migration**: Replace this requirement with the equivalent scenarios in `message-presentation`; the avatar itself continues to be rendered, using the stored avatar when set and an initial-based placeholder otherwise, in both public channels and direct messages.
