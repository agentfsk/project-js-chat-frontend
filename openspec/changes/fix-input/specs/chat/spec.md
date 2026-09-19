# Spec Delta

## ADDED Requirements

### Requirement: Compose messages on multiple lines
The system SHALL provide a multi-line message composer where typed text wraps to a new line when it reaches the end of the input line, pressing Enter inserts a line break and moves the cursor to the next line instead of sending, sending a message happens only through the explicit send button, and line breaks inside a message body are preserved when the message is rendered in the channel.

#### Scenario: Text wraps at the line end
- **WHEN** the user types text long enough to reach the right edge of the message input
- **THEN** the input wraps the cursor to the next line instead of scrolling the current line horizontally

#### Scenario: Enter inserts a line break
- **WHEN** the user presses Enter in the message input
- **THEN** a line break is inserted at the cursor position and the cursor moves to the next line

#### Scenario: Enter does not send
- **WHEN** the user presses Enter in the message input while the composer contains text or a file
- **THEN** no message is sent; the message is sent only when the user clicks the send button

#### Scenario: Multi-line message body renders line breaks
- **WHEN** a message whose body contains line breaks is displayed in the message list
- **THEN** the message shows the line breaks, with each line on its own row