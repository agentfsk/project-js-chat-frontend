# Spec Delta

## MODIFIED Requirements

### Requirement: Sidebar separates private chats and channels
The system SHALL show two tabs in the sidebar — «личные» and «каналы» — where the «личные» tab lists the user's private chats (contacts and received contact requests) and the «каналы» tab lists the shared channels.

#### Scenario: Switch to the channel tab
- **WHEN** the user selects the «каналы» tab
- **THEN** the sidebar shows the shared channels and selecting one opens that channel

#### Scenario: Private chats are listed
- **WHEN** the user selects the «личные» tab
- **THEN** the sidebar shows the user's private chats labelled with the peer's nickname and avatar

#### Scenario: A non-contact peer's chat is labelled with the real nickname
- **WHEN** the user's «личные» list contains a private chat with a peer who is not yet an accepted contact (the sender of a pending incoming contact request, or the recipient of the user's pending outgoing contact request)
- **THEN** the chat entry and the open chat's title show the peer's real nickname and avatar with a «не в контактах» marker, rather than a generated placeholder name