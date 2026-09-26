# unread-indicators Specification

## Purpose

Tells the reader what they missed while they were elsewhere: the backend remembers, per user and per conversation, how far that user has read, and the sidebar turns that into an unread count on every conversation row plus a summed count on each of its two tabs, capped so a quiet channel cannot dominate the sidebar.

## Requirements

### Requirement: Server-side read state per user and conversation
The system SHALL maintain, for each user, the point up to which they have read each conversation they can access, and SHALL scope that state to the user alone. Marking a conversation read SHALL NOT be visible to, and SHALL NOT alter the counts of, any other user.

#### Scenario: Read state is per user
- **WHEN** one user reads a conversation
- **THEN** the unread counts of the other participants of that conversation are unchanged

#### Scenario: Marking a conversation read
- **WHEN** the reader opens a conversation
- **THEN** that conversation's read point for that reader moves to the present

#### Scenario: Marking an inaccessible conversation read is rejected
- **WHEN** a user asks to mark a conversation read that they cannot access
- **THEN** the request is rejected with an error and no read state changes

### Requirement: Read state travels with the chat data
The system SHALL return the reader's read point for each accessible conversation together with the rest of the chat data, so a freshly loaded client shows the same unread counts as a client that has been running.

#### Scenario: Counts survive a reload
- **WHEN** a reader reloads the application after messages arrived while they were away
- **THEN** the sidebar shows the same unread counts it showed before the reload

#### Scenario: A reader's first visit treats existing history as read
- **WHEN** a reader loads the chat data for the first time
- **THEN** messages that already existed at that moment are not counted as unread for that reader

#### Scenario: A conversation created after the first visit
- **WHEN** a conversation is created after the reader's first visit and messages arrive in it
- **THEN** those messages are counted as unread for that reader

#### Scenario: Read state reflects this server's lifetime
- **WHEN** the backend restarts and loses its in-memory state
- **THEN** the reader's next load starts again from a clean slate, consistently with the messages themselves being gone

### Requirement: Marking the open conversation read while it is being read
The system SHALL treat a message as read for the reader when it is delivered to the conversation currently on screen and the reader's attention is on the application, and SHALL leave it unread when their attention is elsewhere. The system SHALL also mark the open conversation read when the reader's attention returns to the application.

#### Scenario: Message in the focused open conversation is read at once
- **WHEN** a message arrives in the conversation on screen while the reader's application window has focus
- **THEN** the conversation shows no unread count afterwards

#### Scenario: Message in the open conversation of a background tab stays unread
- **WHEN** a message arrives in the conversation on screen while the reader's application is not in the foreground
- **THEN** the conversation's unread count grows

#### Scenario: Returning to the application marks the open conversation read
- **WHEN** the reader brings the application back to the foreground
- **THEN** the conversation on screen is marked read and its unread count is cleared

#### Scenario: The reader's own message never counts as unread
- **WHEN** the reader sends a message
- **THEN** that message contributes nothing to any unread count

### Requirement: Unread count on a conversation row
The system SHALL show the number of unread messages from other participants on the row of each conversation in the sidebar, and SHALL show `99+` instead of a number once the count reaches one hundred. A conversation with no unread messages SHALL show no count. Messages sent by the reader SHALL NOT be counted.

#### Scenario: Unread count on a channel row
- **WHEN** messages from other participants arrive in a public channel that the reader has not opened
- **THEN** that channel's row in the sidebar shows how many of them are unread

#### Scenario: Unread count on a direct chat row
- **WHEN** messages from the peer arrive in a direct chat that the reader has not opened
- **THEN** that direct chat's row in the sidebar shows how many of them are unread

#### Scenario: Count is capped
- **WHEN** a conversation has one hundred or more unread messages
- **THEN** its row shows `99+` rather than the exact count

#### Scenario: No count on a read conversation
- **WHEN** a conversation has no unread messages from other participants
- **THEN** its row shows no unread count

#### Scenario: Opening a conversation clears its count
- **WHEN** the reader opens a conversation that shows an unread count
- **THEN** the count is cleared

#### Scenario: Count survives a reload
- **WHEN** the reader reloads the application with an unread conversation in the sidebar
- **THEN** the count is still shown after the reload

### Requirement: Summed counts on the sidebar tabs
The system SHALL show on the tab for direct chats the sum of the unread counts of all direct chats, and on the tab for channels the sum of the unread counts of all public channels, using the same `99+` cap.

#### Scenario: Direct chats tab total
- **WHEN** unread messages exist across several direct chats
- **THEN** the direct chats tab shows the sum of those conversations' unread counts

#### Scenario: Channels tab total
- **WHEN** unread messages exist across several public channels
- **THEN** the channels tab shows the sum of those channels' unread counts

#### Scenario: Tab total is capped
- **WHEN** the summed unread count of a tab reaches one hundred or more
- **THEN** that tab shows `99+`

#### Scenario: No total when nothing is unread
- **WHEN** no conversation has unread messages
- **THEN** neither tab shows a total

### Requirement: Read state stays consistent across the reader's own sessions
The system SHALL reflect a read action in every session the same reader has open, so that a conversation read in one window does not still show an unread count in another window of the same account.

#### Scenario: Reading in one window updates the other
- **WHEN** the reader opens a conversation in one window of the application
- **THEN** that conversation's unread count is cleared in the reader's other open windows as well

#### Scenario: Another user's count is unaffected
- **WHEN** one user marks a conversation read
- **THEN** no other user sees any change in their own unread counts
