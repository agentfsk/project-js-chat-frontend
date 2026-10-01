# message-management Specification

## Purpose

Lets users manage their messages after sending — edit, delete, and pin them — through a context menu on desktop and mobile, with an admin role that can moderate any message and pin in any channel.

## Requirements

### Requirement: Server-stamped message authorship
The system SHALL attribute every message to the authenticated user who sent it: the backend stamps the sender's identity on the message and SHALL ignore any author identity supplied by the client, so message ownership is verifiable server-side.

#### Scenario: The sender's identity is stamped
- **WHEN** a user sends a message
- **THEN** the backend records the authenticated user as the message author regardless of any client-supplied author field

#### Scenario: Client-supplied author is ignored
- **WHEN** a client sends a message claiming to be another user
- **THEN** the backend attributes the message to the authenticated socket user, not the claimed one

### Requirement: Edit a message
The system SHALL let the author of a message edit its text and SHALL let the admin edit any message: editing opens the message in the composer prefilled with the current body, and after saving, the updated body is delivered in real time to the channel participants and the message is shown as edited. A user who is neither the author nor an admin SHALL not be able to edit a message.

#### Scenario: Author edits own message
- **WHEN** the author opens a message in edit mode, changes the body, and saves
- **THEN** participants of the channel see the new body and an «изменено» indicator without a page refresh

#### Scenario: Admin edits another user's message
- **WHEN** the admin opens another user's message in edit mode, changes the body, and saves
- **THEN** participants see the new body and the message is marked as edited

#### Scenario: Editing is denied without permission
- **WHEN** a user who is neither the author nor the admin tries to edit a message
- **THEN** the edit action is not offered, or the backend rejects the edit

#### Scenario: Edited message applied to everyone
- **WHEN** an edit is saved in a channel
- **THEN** every participant of that channel sees the updated body in full history (including reload)

### Requirement: Delete a message
The system SHALL let the author of a message delete it and SHALL let the admin delete any message: a deleted message is removed from the history for all participants and from reloads. A user who is neither the author nor the admin SHALL not be able to delete a message. Deleting a pinned message SHALL also clear its pinned state.

#### Scenario: Author deletes own message
- **WHEN** the author deletes a message
- **THEN** the message disappears from the channel for every participant and on reload

#### Scenario: Admin deletes another user's message
- **WHEN** the admin deletes a message written by another user
- **THEN** the message disappears from the channel for every participant

#### Scenario: Deleting is denied without permission
- **WHEN** a user who is neither the author nor the admin tries to delete a message
- **THEN** the delete action is not offered, or the backend rejects the deletion

#### Scenario: Deleting a pinned message unpins it
- **WHEN** a pinned message is deleted
- **THEN** the message is removed and it no longer appears pinned in the channel

### Requirement: Pin and unpin messages
The system SHALL let users pin and unpin messages within the allowed channels: any participant SHALL be able to pin a message in a private chat, and only the admin SHALL be able to pin in a public channel. Message pinning SHALL NOT be offered in group chats. Pinned messages SHALL show a pin indicator, SHALL be surfaced in a pinned banner at the top of the chat, and the change SHALL be delivered in real time to the channel participants.

#### Scenario: Participant pins in a private chat
- **WHEN** a participant of a private chat pins a message in that chat
- **THEN** the message shows a pin indicator and the pinned banner at the top of that chat displays it for both participants

#### Scenario: Only the admin pins in a public channel
- **WHEN** a non-admin user tries to pin a message in a public channel
- **THEN** the pin action is not offered, or the backend rejects it; the admin's pin in the channel succeeds

#### Scenario: No pinning in a group chat
- **WHEN** the reader opens a group chat and right-clicks or long-presses a message
- **THEN** the context menu offers no pin action and the pinned banner is not shown for the group

#### Scenario: Unpin clears the state
- **WHEN** a pinned message is unpinned
- **THEN** the pin indicator and the pinned banner disappear for every participant

#### Scenario: Pin state survives reload
- **WHEN** a channel has a pinned message and a participant reloads the chat
- **THEN** the pinned message is still marked and shown in the pinned banner

#### Scenario: Banner scrolls to the pinned message
- **WHEN** the user clicks the pinned banner
- **THEN** the chat scrolls to the pinned message

### Requirement: Message context menu on desktop and mobile
The system SHALL open a context menu for a message on right-click (desktop) and on long-press on a touchscreen. The menu SHALL be presented in two parts: a bubble carrying the standard reaction set, and — separated from it by a gap — a bubble carrying only the actions the current user is allowed to take (edit, delete, pin/unpin). The reaction bubble SHALL be the same width as the actions bubble and SHALL sit above it. The reaction bubble SHALL scroll horizontally, SHALL deliberately leave a reaction cut off at its right edge while no scrolling has been applied, and SHALL fade across that edge smoothly from fully opaque at the left to 50% opacity at the right. On narrow viewports the menu SHALL be fully usable and legible as a near-full-width panel, with both bubbles fitting the viewport. The system SHALL NOT offer a separate reaction control inside the message itself: the context menu SHALL be the only place a reaction is chosen.

#### Scenario: Right-click opens the menu
- **WHEN** the user right-clicks a message on desktop
- **THEN** a context menu with the reaction bubble and the permitted actions appears near the message and the browser context menu is suppressed

#### Scenario: Long-press opens the menu on mobile
- **WHEN** the user long-presses a message on a touchscreen
- **THEN** the same context menu appears and is usable without a mouse

#### Scenario: Only permitted actions are shown
- **WHEN** the context menu is opened for a message
- **THEN** the actions bubble lists only the edit/delete/pin actions the current user may perform on that message in that channel

#### Scenario: Menu actions are applied
- **WHEN** the user picks an action from the actions bubble
- **THEN** the chosen edit, delete, or pin action is executed against the message

#### Scenario: The reaction bubble matches the actions bubble in width
- **WHEN** the context menu is open
- **THEN** the reaction bubble and the actions bubble are the same width, the reaction bubble is above the actions bubble, and a visible gap separates them

#### Scenario: The reaction set is larger than the bubble
- **WHEN** the context menu is open and the reaction set has not been scrolled
- **THEN** the rightmost reaction in the bubble is cut off by the bubble's right edge rather than being fully visible, so that the reader can tell the set continues

#### Scenario: The cut-off edge fades
- **WHEN** the context menu is open
- **THEN** the reaction bubble is fully opaque toward its left and the opacity of the cut-off reaction falls smoothly to 50% at the bubble's right edge, while the cut-off reaction remains selectable

#### Scenario: The reaction set scrolls horizontally
- **WHEN** the reader drags the reaction bubble sideways, or scrolls it
- **THEN** the remaining reactions become reachable and the menu stays open while the reaction bubble is being scrolled

#### Scenario: A reaction already applied is marked
- **WHEN** the context menu is opened on a message the reader has already reacted to
- **THEN** that reaction is shown as already applied within the reaction bubble, distinctly from the reactions the reader has not applied

#### Scenario: Picking a reaction toggles it and closes the menu
- **WHEN** the reader picks a reaction from the reaction bubble
- **THEN** that reaction is toggled on the message under the pointer and the context menu closes

#### Scenario: Both bubbles fit a narrow viewport
- **WHEN** the context menu is opened on a viewport narrower than 700px
- **THEN** the reaction bubble and the actions bubble are both fully within the viewport, the reaction bubble is not cut off by the top edge, and the reaction bubble remains the same width as the actions bubble

#### Scenario: No separate reaction control in the message
- **WHEN** a conversation is displayed
- **THEN** no message carries its own button for choosing a reaction, and reactions already applied to a message are shown only as reaction indicators on that message
