# Spec Delta

## ADDED Requirements

### Requirement: Send a picked GIF with its pixel dimensions
The system SHALL send a picked GIF together with the pixel dimensions reported for it, as part of the attachment delivered with the message, so that the receiving client can reserve the exact space the image will occupy before it loads. When the GIF is sent without a text body, the attachment SHALL still carry the dimensions.

#### Scenario: Dimensions travel with the message
- **WHEN** a user picks a GIF and it is sent to a channel
- **THEN** the delivered attachment carries the GIF's pixel width and height alongside its URL

#### Scenario: Receiving client reserves the exact space
- **WHEN** a participant receives a message with a GIF attachment that carries dimensions
- **THEN** the message reserves a box of that aspect ratio at its final display size before the GIF data loads

#### Scenario: Sending a GIF without a text body keeps the dimensions
- **WHEN** a user sends a picked GIF into a chat while the composer is empty
- **THEN** the attachment still carries the GIF's pixel dimensions

#### Scenario: A GIF whose dimensions are unknown still renders
- **WHEN** a participant receives a GIF attachment that carries no dimensions
- **THEN** the message reserves a placeholder box and the GIF is displayed once loaded, without the conversation shifting
