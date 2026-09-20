## ADDED Requirements

### Requirement: Avatar next to nicknames in chat
The system SHALL display the user's avatar next to their nickname in headers of their messages throughout the chat, and SHALL display the peer's avatar next to the channel name in the title of a direct-message chat. The avatar uses the stored picture when set and an initial-based placeholder otherwise, and reflects avatar changes made through the profile without a page refresh.

#### Scenario: Avatar in the direct-message title
- WHEN a user opens a private chat with another user who has an avatar set
- THEN the direct-message title shows the peer's avatar image next to the channel name

#### Scenario: Avatar placeholder in the direct-message title
- WHEN a user opens a private chat with another user who has no avatar
- THEN the direct-message title shows an initial-based placeholder next to the channel name

#### Scenario: Updated avatar reflected in chat
- WHEN the peer of a direct chat changes their avatar
- THEN the avatar shown in the direct-message title updates to the new picture without a page refresh