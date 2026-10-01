# Spec Delta

## MODIFIED Requirements

### Requirement: Unread count on a conversation row
The system SHALL show the number of unread messages from other participants on the row of each conversation in the sidebar — including public channels, direct chats and group chats — and SHALL show `99+` instead of a number once the count reaches one hundred. A conversation with no unread messages SHALL show no count. Messages sent by the reader SHALL NOT be counted.

#### Scenario: Unread count on a channel row
- **WHEN** messages from other participants arrive in a public channel that the reader has not opened
- **THEN** that channel's row in the sidebar shows how many of them are unread

#### Scenario: Unread count on a direct chat row
- **WHEN** messages from the peer arrive in a direct chat that the reader has not opened
- **THEN** that direct chat's row in the sidebar shows how many of them are unread

#### Scenario: Unread count on a group row
- **WHEN** messages from other members arrive in a group that the reader has not opened
- **THEN** that group's row in the sidebar shows how many of them are unread

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
The system SHALL show on the «личные» tab the sum of the unread counts of all direct chats and group chats, and on the «каналы» tab the sum of the unread counts of all public channels, using the same `99+` cap.

#### Scenario: Direct chats tab total
- **WHEN** unread messages exist across several direct chats
- **THEN** the «личные» tab shows the sum of those conversations' unread counts

#### Scenario: Groups contribute to the «личные» tab total
- **WHEN** unread messages exist in one or more group chats
- **THEN** those messages are part of the «личные» tab total alongside the direct chats

#### Scenario: Channels tab total
- **WHEN** unread messages exist across several public channels
- **THEN** the «каналы» tab shows the sum of those channels' unread counts

#### Scenario: Tab total is capped
- **WHEN** the summed unread count of a tab reaches one hundred or more
- **THEN** that tab shows `99+`

#### Scenario: No total when nothing is unread
- **WHEN** no conversation has unread messages
- **THEN** neither tab shows a total