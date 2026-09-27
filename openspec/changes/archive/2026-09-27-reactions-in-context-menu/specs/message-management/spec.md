# Spec Delta

## MODIFIED Requirements

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
