# Spec Delta

## Purpose

Lets users exchange text messages in named channels, with the channel list and message stream kept in sync in real time.

## ADDED Requirements

### Requirement: Channels are listed
The system SHALL display all available channels by name in a sidebar.

#### Scenario: Channels loaded
- **WHEN** the chat screen opens after authentication
- **THEN** the sidebar shows the channel names returned by the backend, and one channel is marked as active

### Requirement: Switch channel
The system SHALL display the messages belonging to the currently selected channel and allow the user to select a different channel.

#### Scenario: Select a different channel
- **WHEN** the user clicks a channel in the sidebar
- **THEN** the message list updates to show messages for that channel, and that channel becomes the active channel

### Requirement: Send a message
The system SHALL allow the user to type a text message and send it to the active channel.

#### Scenario: Message sent successfully
- **WHEN** the user types a message body and submits the form
- **THEN** the system emits a newMessage event to the backend and the new message appears in the message list

### Requirement: Receive messages in real time
The system SHALL display new messages arriving from other users without requiring a page refresh.

#### Scenario: Incoming message
- **WHEN** the backend broadcasts a newMessage event for any channel
- **THEN** the message appears at the bottom of that channel's message list

### Requirement: Create a channel
The system SHALL allow the user to create a new channel by providing a name.

#### Scenario: Channel created successfully
- **WHEN** the user submits a new channel name and the backend acknowledges the event
- **THEN** the new channel appears in the sidebar

### Requirement: Rename a channel
The system SHALL allow the user to rename an existing removable channel.

#### Scenario: Channel renamed
- **WHEN** the user edits the name of a removable channel and submits the change
- **THEN** the sidebar updates to show the new name

### Requirement: Remove a channel
The system SHALL allow the user to remove a removable channel after confirming the action.

#### Scenario: Channel removed successfully
- **WHEN** the user confirms removal of a removable channel and the backend acknowledges the event
- **THEN** the channel is removed from the sidebar and its messages are no longer displayed

#### Scenario: Cannot remove a default channel
- **WHEN** the user views a channel marked as non-removable
- **THEN** the system does not offer a remove action for that channel

### Requirement: Real-time channel events
The system SHALL update the sidebar when channels are created, renamed, or removed by other users.

#### Scenario: Incoming channel events
- **WHEN** the backend broadcasts a newChannel, renameChannel, or removeChannel event
- **THEN** the sidebar updates to reflect the change
