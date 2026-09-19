# direct-messages Specification

## Purpose

Lets two users exchange messages in a private one-to-one chat that is delivered in real time only to them: any discovered user (via search or contacts) can be messaged directly, and the sidebar separates private chats under «личные» from shared channels under «каналы».

## Requirements

### Requirement: Sidebar separates private chats and channels
The system SHALL show two tabs in the sidebar — «личные» and «каналы» — where the «личные» tab lists the user's private chats (contacts and received contact requests) and the «каналы» tab lists the shared channels.

#### Scenario: Switch to the channel tab
- **WHEN** the user selects the «каналы» tab
- **THEN** the sidebar shows the shared channels and selecting one opens that channel

#### Scenario: Private chats are listed
- **WHEN** the user selects the «личные» tab
- **THEN** the sidebar shows the user's private chats labelled with the peer's nickname and avatar

### Requirement: Start a private chat
The system SHALL let the user start (or reopen) a one-to-one private chat with any other user, either from that user's profile or from an accepted contact, and SHALL reuse the same private chat for the pair instead of creating duplicates.

#### Scenario: Start the chat from a profile
- **WHEN** the user clicks the private message action on another user's profile
- **THEN** the private chat with that user opens in the «личные» section

#### Scenario: Start the chat from a contact
- **WHEN** the user clicks an accepted contact in the «личные» section
- **THEN** the private chat with that contact opens

#### Scenario: Chat is reused
- **WHEN** the pair already has a private chat and either user starts it again
- **THEN** the existing private chat is opened, not a duplicate

### Requirement: Deliver private messages in real time
The system SHALL deliver a message sent into a private chat to both participants without a page refresh, and SHALL not deliver it to anyone outside the pair.

#### Scenario: Both participants receive the message
- **WHEN** a user sends a message into a private chat
- **THEN** the message appears in that chat for both participants without a page refresh

#### Scenario: Only the pair receives the message
- **WHEN** a message is sent into a private chat
- **THEN** no user outside the two participants receives it