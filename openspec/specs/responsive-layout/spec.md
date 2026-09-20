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

### Requirement: Login page is usable on narrow screens
The system SHALL keep the login and signup form centered and fully usable on narrow screens without horizontal scrolling.

#### Scenario: Narrow viewport shows the form centered
- **WHEN** the login page is open in a viewport narrower than 700px
- **THEN** the auth card is centered, fully visible, and no horizontal scrolling occurs