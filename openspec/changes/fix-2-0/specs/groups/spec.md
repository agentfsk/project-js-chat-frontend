# Spec Delta

## MODIFIED Requirements

### Requirement: Role hierarchy in a group
The system SHALL maintain a role per member of `owner`, `admin` or `member`: the creator becomes the owner, the owner can promote a member to admin and take that role back from an admin, and the role determines the moderation actions a member may take inside the group. The owner SHALL hold full moderation authority over every other member, including admins; an admin SHALL hold authority only over plain members; and the owner SHALL never be a target of moderation by anyone.

#### Scenario: Owner promotes a member to admin
- **WHEN** the owner selects «Сделать администратором» on a member
- **THEN** that member becomes an admin and can mute other members in the group

#### Scenario: Owner takes admin rights back
- **WHEN** the owner selects «Забрать права администратора» on an admin
- **THEN** that member stops being an admin, loses the ability to mute anyone in the group, and their row offers «Сделать администратором» again

#### Scenario: Owner opens a menu on an admin
- **WHEN** the owner right-clicks or long-presses another admin's row in the member list
- **THEN** the moderation menu opens and offers «Забрать права администратора», «Заглушить» and «Удалить»

#### Scenario: Admin actions are limited to muting
- **WHEN** an admin opens the member menu
- **THEN** the menu offers only the mute / restore-voice action and no promote, demote or remove actions

#### Scenario: An admin cannot act on other admins or the owner
- **WHEN** an admin right-clicks or long-presses another admin or the owner in the member list
- **THEN** no moderation menu opens for that member

#### Scenario: A regular member sees no moderation menu
- **WHEN** a member who is neither owner nor admin interacts with a row in the member list
- **THEN** no moderation menu is shown at all

#### Scenario: Nobody moderates the owner
- **WHEN** any member other than the owner interacts with the owner's row in the member list
- **THEN** no moderation menu opens for the owner

### Requirement: Mute a member for a fixed duration
The system SHALL let the owner mute any other member of the group, including an admin, and SHALL let an admin mute a non-privileged member of the group, choosing a duration of 1, 2, 5, 12 or 24 hours or 3 days, SHALL record the mute until the chosen time, and SHALL reject muting the owner and SHALL reject an admin's attempt to mute another admin. While the mute is active the affected member SHALL be unable to send messages to the group; the server SHALL enforce this on every message attempt.

#### Scenario: Owner mutes a member
- **WHEN** the owner or an admin selects «Заглушить» on a member and picks a duration
- **THEN** the member cannot send messages to the group until the chosen duration elapses, and the member's row shows the muted state

#### Scenario: Owner mutes an admin
- **WHEN** the owner selects «Заглушить» on an admin and picks a duration
- **THEN** the mute is applied and the admin cannot send messages to the group until it expires

#### Scenario: Muting an admin by another admin is rejected
- **WHEN** an admin attempts to mute another admin, or any user attempts to mute the owner
- **THEN** the attempt is rejected and no mute is applied

#### Scenario: A muted member cannot send
- **WHEN** a muted member attempts to send a message to the group before the mute expires
- **THEN** the server rejects the message and the member's composer shows the mute state

### Requirement: Remove a member from a group
The system SHALL let the owner remove any other member of the group, including an admin, after a «Да / Нет» confirmation prompt, and SHALL end the removed member's access to the group and its messages immediately for all parties.

#### Scenario: Owner removes a member
- **WHEN** the owner selects «Удалить» on a member and confirms
- **THEN** the member loses access to the group, the group disappears from their «личные» section, and the member list updates for the remaining members

#### Scenario: Owner removes an admin
- **WHEN** the owner selects «Удалить» on an admin and confirms
- **THEN** the admin loses access to the group and the member list updates for the remaining members

#### Scenario: Player removal is cancelled
- **WHEN** the owner answers «Нет» to the removal confirmation
- **THEN** the member remains in the group with no state change

### Requirement: Member actions open by right-click or long-press
The system SHALL open the member moderation menu on right-click on desktop and on long-press on a touchscreen for every member the viewer is allowed to moderate, following the messenger's existing long-press pattern, and SHALL suppress the native context menu while it is open.

#### Scenario: Right-click opens the member menu
- **WHEN** an authorized member right-clicks another member's row on desktop
- **THEN** the moderation menu opens near the row and the browser context menu is suppressed

#### Scenario: Right-click on an admin row opens a menu for the owner
- **WHEN** the owner right-clicks another admin's row on desktop
- **THEN** the moderation menu opens near the row for that admin

#### Scenario: Long-press opens the member menu on mobile
- **WHEN** an authorized member long-presses a member's row on a touchscreen
- **THEN** the same moderation menu opens and is usable without a mouse
