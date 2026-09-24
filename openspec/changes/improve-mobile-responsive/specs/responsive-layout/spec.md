# Spec Delta

## MODIFIED Requirements

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

#### Scenario: Content avoids device notches and gesture bars
- **WHEN** the app is open on a device with screen insets (notch or gesture bar) in portrait or landscape
- **THEN** the header, message composer, drawer, and call overlay keep their content clear of the insets

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

## ADDED Requirements

### Requirement: Active call is usable on a phone
The system SHALL render the active-call view with the remote video, self-view, controls, and duration fully visible and usable on a phone in portrait or landscape, without overflowing the screen.

#### Scenario: Call view fits a phone screen
- **WHEN** an active call is displayed on a phone
- **THEN** the remote video fills the available area, the self-view and duration stay visible, and the call controls remain reachable without scrolling

#### Scenario: Call controls are reachable in landscape
- **WHEN** the phone is held in landscape during a call
- **THEN** the call controls and their tap targets remain visible and usable

## REMOVED Requirements

None.