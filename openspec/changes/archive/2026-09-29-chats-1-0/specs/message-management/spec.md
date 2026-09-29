# Spec Delta

## MODIFIED Requirements

### Requirement: Pin and unpin messages
The system SHALL let users pin and unpin messages within the allowed channels: any participant SHALL be able to pin a message in a private chat, and only the admin SHALL be able to pin in a public channel. Message pinning SHALL NOT be offered in group chats. Pinned messages SHALL show a pin indicator, SHALL be surfaced in a pinned banner at the top of the chat, and the change SHALL be delivered in real time to the channel participants.

#### Scenario: Participant pins in a private chat
- **WHEN** a participant of a private chat pins a message in that chat
- **THEN** the message shows a pin indicator and the pinned banner at the top of that chat displays it for both participants

#### Scenario: Only the admin pins in a public channel
- **WHEN** a non-admin user tries to pin a message in a public channel
- **THEN** the pin action is not offered, or the backend rejects it; the admin's pin in the channel succeeds

#### Scenario: No pinning in a group chat
- **WHEN** the reader opens a group chat and right-clicks or long-presses a message
- **THEN** the context menu offers no pin action and the pinned banner is not shown for the group

#### Scenario: Unpin clears the state
- **WHEN** a pinned message is unpinned
- **THEN** the pin indicator and the pinned banner disappear for every participant

#### Scenario: Pin state survives reload
- **WHEN** a channel has a pinned message and a participant reloads the chat
- **THEN** the pinned message is still marked and shown in the pinned banner

#### Scenario: Banner scrolls to the pinned message
- **WHEN** the user clicks the pinned banner
- **THEN** the chat scrolls to the pinned message