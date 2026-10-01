# Spec Delta

## MODIFIED Requirements

### Requirement: Render message attachments
The system SHALL render an attachment according to its type: images as a preview, other supported types as a clickable download link showing the filename and size. An image preview SHALL never exceed the width available to its message and SHALL preserve its aspect ratio.

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

## ADDED Requirements

None.

## REMOVED Requirements

None.
