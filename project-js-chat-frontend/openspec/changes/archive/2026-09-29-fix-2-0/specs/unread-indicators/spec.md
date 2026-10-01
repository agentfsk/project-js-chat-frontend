# Spec Delta

## ADDED Requirements

### Requirement: Conversations are ordered by unread count
The system SHALL order the rows of each sidebar tab by unread count, placing conversations with more unread messages above conversations with fewer, on both the «личные» and «каналы» tabs. Conversations with equal counts SHALL be ordered so that the one whose newest unread message arrived earlier comes first, and conversations with no unread messages SHALL be placed after every conversation that has unread messages. The order SHALL NOT change while the reader is looking at the tab, and SHALL be recomputed when an unread count changes.

#### Scenario: Busiest conversation on top
- **WHEN** one conversation in the «личные» tab has five unread messages and another has two
- **THEN** the five-message conversation's row is above the two-message conversation's row

#### Scenario: Same count, earlier arrival first
- **WHEN** two conversations in the «каналы» tab both have three unread messages and the third message of one arrived before the third message of the other
- **THEN** the conversation that reached three unread earlier is above the other

#### Scenario: Conversations without unread messages sit at the bottom
- **WHEN** the «личные» tab holds one conversation with unread messages and several with none
- **THEN** every conversation without unread messages is below the one that has them

#### Scenario: Both tabs are ordered
- **WHEN** the reader switches between the «личные» and «каналы» tabs
- **THEN** each tab's rows are ordered by their own unread counts

#### Scenario: Opening a conversation reorders the tab
- **WHEN** the reader opens a conversation and its unread count drops to zero
- **THEN** that row moves down to the read part of the tab without the reader reloading

### Requirement: Unread counts are derived in a single pass
The system SHALL derive the unread count of every conversation the reader can access from one pass over the known messages, so that a client holding many messages does not re-read the whole message list once per conversation, and SHALL show the same counts on the row badges and in the tab totals.

#### Scenario: Row badges and tab totals agree
- **WHEN** the sidebar is rendered for a reader with unread messages in several conversations
- **THEN** every row's count and both tab totals are derived from the same computed counts and agree with each other

#### Scenario: A reader's own messages never enter a count
- **WHEN** the index is computed for a reader who sent messages in several conversations
- **THEN** those messages are excluded from every conversation's count
