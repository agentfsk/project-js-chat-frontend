# responsive-layout Specification

## Purpose

Adapts the messenger layout to the viewing device: a desktop layout with a persistent channel sidebar on wide screens, and a mobile layout with drawer-based channel navigation on narrow screens, so the app is usable from a phone.

## Requirements

### Requirement: Desktop layout on wide screens
The system SHALL lay out the chat page as a desktop layout, with the top header and a persistent channel sidebar next to the chat area, when the viewport width is at least 700px.

#### Scenario: Wide viewport shows the desktop layout
- **WHEN** the chat page is open in a viewport 700px or wider
- **THEN** the channel sidebar is visible alongside the chat area and no burger button is shown

### Requirement: Mobile layout on narrow screens
The system SHALL lay out the chat page as a mobile layout when the viewport is narrower than 700px: the channel sidebar is hidden behind a slide-in drawer, the chat area fills the screen, and a burger button in the header opens the drawer.

#### Scenario: Narrow viewport shows the chat-only layout
- **WHEN** the chat page is open in a viewport narrower than 700px
- **THEN** the channel sidebar is not shown and the chat area fills the screen

#### Scenario: Burger button opens the drawer
- **WHEN** the user taps the burger button on a narrow screen
- **THEN** the channel sidebar slides in over the chat area and the chat area is dimmed

#### Scenario: Selecting a channel closes the drawer
- **WHEN** the user selects a channel in the open drawer
- **THEN** the drawer closes and the selected channel becomes the active one

#### Scenario: Backdrop click closes the drawer
- **WHEN** the user taps the dimmed chat area while the drawer is open
- **THEN** the drawer closes without changing the active channel

#### Scenario: The layout adapts to each phone resolution
- **WHEN** the chat page is open on a phone with any width from 320px up to 700px
- **THEN** the layout scales fluidly to the available width and no horizontal scrolling occurs

#### Scenario: Overlays, pickers and modals fit small screens
- **WHEN** the user opens the emoji picker, a GIF picker, a modal, or the call overlays on a narrow screen
- **THEN** the panel fits fully within the viewport without horizontal scrolling or clipped content

#### Scenario: Modals with long content fit short viewports
- **WHEN** the user opens the GIF picker or another modal in a short viewport, such as a phone held in landscape
- **THEN** the modal never exceeds the viewport height, the modal's scrollable region shrinks to the available space, and the close control and action buttons stay visible without the panel being cut off

#### Scenario: Transient overlays stay inside the viewport
- **WHEN** a call toast or a reaction picker appears near a screen edge on a narrow screen
- **THEN** the overlay stays fully within the viewport with its text wrapped or truncated rather than extending past the edge

#### Scenario: Content avoids device notches and gesture bars
- **WHEN** the app is open on a device with screen insets (notch or gesture bar) in portrait or landscape
- **THEN** the header, message composer, message list, drawer, and call overlay keep their content clear of the insets

#### Scenario: Message bubbles clear the notch in landscape
- **WHEN** a notched phone is held in landscape and shows a message thread
- **THEN** no message bubble, avatar, or reaction control is drawn beneath the side notch, because in landscape the insets apply to the left and right edges

#### Scenario: Touch targets are large enough on phones
- **WHEN** the user interacts with composer buttons, drawer items, or call controls on a narrow screen
- **THEN** each interactive control has a tap target of at least 40px and the control is not cramped

### Requirement: Login page is usable on narrow screens
The system SHALL keep the login and signup form centered and fully usable on narrow screens without horizontal scrolling.

#### Scenario: Narrow viewport shows the form centered
- **WHEN** the login page is open in a viewport narrower than 700px
- **THEN** the auth card is centered, fully visible, and no horizontal scrolling occurs

#### Scenario: Auth card fits the smallest phones
- **WHEN** the login page is open on a phone 320px wide or taller in landscape
- **THEN** the auth card fits within the viewport with the tabs and buttons fully visible and no horizontal scrolling

### Requirement: Active call is usable on a phone
The system SHALL render the active-call view with the remote video, self-view, controls, and duration fully visible and usable on a phone in portrait or landscape, without overflowing the screen.

#### Scenario: Call view fits a phone screen
- **WHEN** an active call is displayed on a phone
- **THEN** the remote video fills the available area, the self-view and duration stay visible, and the call controls remain reachable without scrolling

#### Scenario: Call controls are reachable in landscape
- **WHEN** the phone is held in landscape during a call
- **THEN** the call controls and their tap targets remain visible and usable
