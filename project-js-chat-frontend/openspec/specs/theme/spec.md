# theme Specification

## Purpose

Lets users choose between a dark and a light appearance with a toggle control available from any screen, dark by default, with the choice persisted across visits.

## Requirements

### Requirement: Dark theme is the default
The system SHALL apply the dark theme by default when the visitor has no stored theme preference.

#### Scenario: First visit uses the dark theme
- **WHEN** a visitor opens the site with no stored theme preference
- **THEN** the dark theme is applied on every screen

### Requirement: Theme toggle switches between dark and light
The system SHALL provide a theme toggle control on both the login page and the chat header that switches the whole application between the dark and light themes and reflects the currently active theme.

#### Scenario: Toggle switches to the light theme
- **WHEN** the user presses the theme toggle while the dark theme is active
- **THEN** all screens render in the light theme and the toggle reflects it

#### Scenario: Toggle switches back to the dark theme
- **WHEN** the user presses the theme toggle while the light theme is active
- **THEN** all screens render in the dark theme and the toggle reflects it

### Requirement: Theme choice persists across sessions
The system SHALL persist the chosen theme and SHALL apply it before the first render, so no flash of the wrong theme occurs on load.

#### Scenario: Reload keeps the chosen theme
- **WHEN** the user chooses the light theme and reloads the page
- **THEN** the light theme is applied on load without briefly showing the dark background

### Requirement: Theme applies to all elements
The system SHALL apply the active theme consistently to every part of the interface, including pages, modals, and pickers, so no element keeps colors from the other theme.

#### Scenario: Modals and pickers follow the theme
- **WHEN** the light theme is active and the user opens a modal or the emoji or GIF picker
- **THEN** those elements render with light-theme colors