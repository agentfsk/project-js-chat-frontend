# Spec Delta

## Purpose

Lets users run persistent multi-user conversations with their own identity: a group has a name, description and avatar, a membership list drawn from contacts, an owner who moderates it, and server-enforced muting — with groups housed in the «личные» tab next to direct chats.

## ADDED Requirements

### Requirement: Create a group from the «личные» section
The system SHALL let the user start creating a group from a «+» action above the «личные» search, SHALL present a creation dialog asking for a group name, an optional description, an optional avatar, and member selection restricted to the creator's contacts, and SHALL create the group with the creator as its owner once a name and at least one member are provided.

#### Scenario: Create a group with contacts
- **WHEN** the user opens the create-group dialog, enters a name, an optional description, uploads an optional avatar, selects members from their contacts, and confirms
- **THEN** the group is created with the user as owner and the selected contacts as members, and appears in the «личные» section

#### Scenario: Only contacts can be picked
- **WHEN** the user picks members while creating a group
- **THEN** the member picker offers only the user's accepted contacts and no other profiles

#### Scenario: Confirming without a name
- **WHEN** the user confirms group creation without entering a name
- **THEN** the creation fails with an error and no group is created

### Requirement: Groups are listed in the «личные» section
The system SHALL list the user's groups in the «личные» section alongside direct chats, each shown with its avatar (or a placeholder for its name) and name, and SHALL let the user open the group's conversation by selecting it.

#### Scenario: A created group appears in «личные»
- **WHEN** the user or another member creates a group that includes the reader
- **THEN** the group appears in the reader's «личные» section with its avatar and name, and opens as a normal conversation

#### Scenario: A group not joined stays hidden
- **WHEN** the reader loads chat data
- **THEN** groups the reader does not belong to are not listed

### Requirement: Group conversations support the standard message features
The system SHALL treat a group as a standard conversation in which members can send text, attachments, GIF and emoji messages, edit and delete their own messages, react to messages, and reply to messages, following the same rules and delivery as other channels.

#### Scenario: Messages are exchanged in a group
- **WHEN** a member sends a message into the group
- **THEN** the message is delivered in real time to the other group members and appears in the conversation with the author's identity

#### Scenario: Calls and pinning are not offered in groups
- **WHEN** the reader opens a group conversation
- **THEN** no call action and no pin action are offered for the group or its messages

### Requirement: Group messages are delivered only to members
The system SHALL deliver every group event and message to the group's members in real time and SHALL not deliver them to any user who is not a member of that group.

#### Scenario: Member broadcasts reach the members
- **WHEN** a message or group event occurs in a group
- **THEN** every connected member receives it without a page refresh and no non-member receives it

### Requirement: Group info menu with member list
The system SHALL show a «…» menu on a group's row in the «личные» section that presents the group's avatar, name, description and its list of members for every participant, and SHALL additionally present the owner with «Пригласить друзей», «Изменить группу» and a red «Удалить группу» action.

#### Scenario: A member sees the group info
- **WHEN** any member opens the group's «…» menu
- **THEN** the menu shows the group avatar, name, description, and the member list with each member's identity

#### Scenario: The owner sees the owner actions
- **WHEN** the owner opens the group's «…» menu
- **THEN** in addition to the shared info the menu shows «Пригласить друзей», «Изменить группу», and a red «Удалить группу»

### Requirement: Invite members to a group
The system SHALL let the owner invite additional members from their contacts while the group exists, from the «Пригласить друзей» action, and SHALL reject invites for users who are not the owner's contacts.

#### Scenario: Owner invites a contact
- **WHEN** the owner picks an accepted contact from the invite dialog and confirms
- **THEN** the contact joins the group and the group's member list updates for all members in real time

#### Scenario: Non-owner invite is rejected
- **WHEN** a member who is not the owner attempts to invite someone into the group
- **THEN** the attempt is rejected with an error and the member list is unchanged

### Requirement: Edit a group
The system SHALL let the owner change the group's name, description and avatar through the «Изменить группу» action, and SHALL update the group's identity for all members in real time.

#### Scenario: Owner updates the group
- **WHEN** the owner changes the group name, description, or avatar and saves
- **THEN** the changes appear in the «личные» row and the info menu for every member without a page refresh

### Requirement: Delete a group with typed confirmation
The system SHALL let the owner delete a group only after two confirmations: a «Да / Нет» prompt, followed by a dialog that requires typing the word `Yes` exactly. Deleting SHALL remove the group and its messages for all members.

#### Scenario: A non-owner cannot delete the group
- **WHEN** a member who is not the owner attempts to delete the group
- **THEN** the attempt is rejected with an error and the group remains available

#### Scenario: Owner confirms, then types Yes
- **WHEN** the owner answers «Да» to the first prompt and types `Yes` in the second dialog
- **THEN** the group disappears for every member and its messages are removed

#### Scenario: Owner abandons the second confirmation
- **WHEN** the owner answers «Да» to the first prompt but does not type `Yes` in the second dialog
- **THEN** the group is not deleted and remains available

### Requirement: Role hierarchy in a group
The system SHALL maintain a role per member of `owner`, `admin` or `member`: the creator becomes the owner, the owner can promote members to admin, and the role determines the moderation actions a member may take inside the group.

#### Scenario: Owner promotes a member to admin
- **WHEN** the owner selects «Сделать администратором» on a member
- **THEN** that member becomes an admin and can mute other members in the group

#### Scenario: Admin actions are limited to muting
- **WHEN** an admin opens the member menu
- **THEN** the menu offers only the mute / restore-voice action and no promote or remove actions

#### Scenario: An admin cannot act on other admins or the owner
- **WHEN** an admin right-clicks or long-presses another admin or the owner in the member list
- **THEN** no moderation menu opens for that member

#### Scenario: A regular member sees no moderation menu
- **WHEN** a member who is neither owner nor admin interacts with a row in the member list
- **THEN** no moderation menu is shown at all

### Requirement: Mute a member for a fixed duration
The system SHALL let the owner or an admin mute a non-privileged member of the group from that member's row, choosing a duration of 1, 2, 5, 12 or 24 hours or 3 days, SHALL record the mute until the chosen time, and SHALL reject muting an admin or the owner. While the mute is active the affected member SHALL be unable to send messages to the group; the server SHALL enforce this on every message attempt.

#### Scenario: Owner mutes a member
- **WHEN** the owner or an admin selects «Заглушить» on a member and picks a duration
- **THEN** the member cannot send messages to the group until the chosen duration elapses, and the member's row shows the muted state

#### Scenario: Muting an admin or owner is rejected
- **WHEN** the owner attempts to mute an admin, or any user attempts to mute the owner
- **THEN** the attempt is rejected and no mute is applied

#### Scenario: A muted member cannot send
- **WHEN** a muted member attempts to send a message to the group before the mute expires
- **THEN** the server rejects the message and the member's composer shows the mute state

### Requirement: Muted composer with live countdown
The system SHALL show the muted member a banner instead of an active composer that reads «Вы заглушены в этой группе на …» together with the remaining duration, updating every second until the mute expires, after which the composer becomes usable again.

#### Scenario: A muted member sees the countdown
- **WHEN** a muted member opens the group
- **THEN** the composer is disabled and shows the mute message with the time remaining, counting down each second

#### Scenario: Composer returns after expiration
- **WHEN** the mute duration elapses
- **THEN** the banner disappears and the composer is enabled again

### Requirement: Restore a muted member's voice
The system SHALL replace the «Заглушить» action with «Вернуть голос» for a member who is currently muted, SHALL let the owner or an admin end the mute early by selecting it, and SHALL restore the member's ability to send immediately.

#### Scenario: Admin restores voice early
- **WHEN** the owner or an admin selects «Вернуть голос» on a muted member
- **THEN** the member regains the ability to send to the group immediately and the row no longer shows the muted state

### Requirement: Remove a member from a group
The system SHALL let the owner remove a member from the group after a «Да / Нет» confirmation prompt, and SHALL end the removed member's access to the group and its messages immediately for all parties.

#### Scenario: Owner removes a member
- **WHEN** the owner selects «Удалить» on a member and confirms
- **THEN** the member loses access to the group, the group disappears from their «личные» section, and the member list updates for the remaining members

#### Scenario: Player removal is cancelled
- **WHEN** the owner answers «Нет» to the removal confirmation
- **THEN** the member remains in the group with no state change

### Requirement: Member actions open by right-click or long-press
The system SHALL open the member moderation menu on right-click on desktop and on long-press on a touchscreen, following the messenger's existing long-press pattern, and SHALL suppress the native context menu while it is open.

#### Scenario: Right-click opens the member menu
- **WHEN** an authorized member right-clicks another member's row on desktop
- **THEN** the moderation menu opens near the row and the browser context menu is suppressed

#### Scenario: Long-press opens the member menu on mobile
- **WHEN** an authorized member long-presses a member's row on a touchscreen
- **THEN** the same moderation menu opens and is usable without a mouse