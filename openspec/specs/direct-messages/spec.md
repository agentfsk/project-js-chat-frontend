# direct-messages Specification

## Purpose

Lets two users exchange messages in a private one-to-one chat that is delivered in real time only to them: any discovered user (via search or contacts) can be messaged directly, and the sidebar separates private chats under «личные» from shared channels under «каналы».

## Requirements

### Requirement: Sidebar separates private chats and channels
The system SHALL show two tabs in the sidebar — «личные» and «каналы» — where the «личные» tab lists the user's private chats (contacts and received contact requests) and the «каналы» tab lists the shared channels. The «личные» tab SHALL also list the user's group chats alongside the direct chats.

#### Scenario: Switch to the channel tab
- **WHEN** the user selects the «каналы» tab
- **THEN** the sidebar shows the shared channels and selecting one opens that channel

#### Scenario: Private chats are listed
- **WHEN** the user selects the «личные» tab
- **THEN** the sidebar shows the user's private chats labelled with the peer's nickname and avatar

#### Scenario: Groups are listed alongside the direct chats
- **WHEN** the user selects the «личные» tab and they are a member of one or more groups
- **THEN** the sidebar lists those groups with their avatar, name and unread count alongside the direct chats, and selecting one opens the group conversation

#### Scenario: A non-contact peer's chat is labelled with the real nickname
- **WHEN** the user's «личные» list contains a private chat with a peer who is not yet an accepted contact (the sender of a pending incoming contact request, or the recipient of the user's pending outgoing contact request)
- **THEN** the chat entry and the open chat's title show the peer's real nickname and avatar with a «не в контактах» marker, rather than a generated placeholder name

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

### Requirement: Search over the reader's own chats
The system SHALL filter the «личные» list by the reader's own conversations when the search field is in its default mode: typing SHALL match direct chats by the peer's nickname and groups by the group name, client-side and without querying the user directory, and SHALL show an empty state when nothing matches. The field's placeholder in this mode SHALL read «Поиск чатов».

#### Scenario: Search finds an own chat
- **WHEN** the user types a nickname or group name that matches one of their direct chats or groups
- **THEN** the «личные» list narrows to the matching conversations and no server request is made

#### Scenario: Search has no matches among own chats
- **WHEN** the user types text that matches none of their direct chats and groups
- **THEN** the «личные» list shows an empty state

#### Scenario: The placeholder reflects the chat-search mode
- **WHEN** the search field is in its default mode
- **THEN** its placeholder reads «Поиск чатов»

### Requirement: The «+» popover switches search modes and opens creation
The system SHALL show a «+» action above the «личные» search that opens a popover with two actions: «Найти друзей» and «Создать группу». Selecting «Найти друзей» SHALL switch the search field into user-directory mode with placeholder «Поиск пользователей», in which typing searches the user directory by nickname. Selecting «Создать группу» SHALL open the group creation dialog.

#### Scenario: Find friends switches to user search
- **WHEN** the user selects «Найти друзей» in the «+» popover
- **THEN** the search field placeholder changes to «Поиск пользователей» and typing searches the user directory rather than the reader's own chats

#### Scenario: Create group opens the creation dialog
- **WHEN** the user selects «Создать группу» in the «+» popover
- **THEN** the group creation dialog opens with fields for name, description, avatar and member selection

#### Scenario: User search returns to own-chat search
- **WHEN** the user clears the user-directory search mode
- **THEN** the search field returns to the default own-chat mode with placeholder «Поиск чатов»
