# gif Specification

## Purpose

Lets users express themselves with GIFs: a GIPHY-powered picker in the message composer for choosing a GIF, and sending it to a channel as a realtime image message that every participant receives without a page refresh.

## Requirements

### Requirement: Open GIF picker from the composer
The system SHALL provide a GIF button in the message composer that opens a picker showing a searchable list of GIFs from GIPHY, with trending GIFs shown when no search is active.

#### Scenario: Pickers opens with trending GIFs
- **WHEN** the user clicks the GIF button in the composer
- **THEN** the system opens a picker showing a grid of trending GIFs and a search field

#### Scenario: Search returns matching GIFs
- **WHEN** the user types a search query in the picker
- **THEN** the system shows GIFs matching the query

#### Scenario: Search has no results
- **WHEN** the user searches for a query with no matching GIFs
- **THEN** the system shows an empty state without crashing

### Requirement: Send a picked GIF as a realtime message
The system SHALL send a picked GIF to the active channel immediately as a message with an `image/gif` attachment pointing at the GIPHY CDN, delivered to all connected participants without a page refresh and rendered as the GIF image.

#### Scenario: Select a GIF in the picker
- **WHEN** the user clicks a GIF in the picker
- **THEN** the picker closes and the GIF is sent to the active channel

#### Scenario: GIF delivered to other participants
- **WHEN** a user sends a GIF in a channel
- **THEN** the GIF appears in that channel for every other connected participant

#### Scenario: GIF rendered as an image
- **WHEN** a message with a GIF attachment is displayed
- **THEN** the GIF image is shown inline in the message

### Requirement: Surface GIPHY failures without crashing
The system SHALL show an inline error when the GIPHY API cannot be reached or the send acknowledgment fails, without crashing the app or losing the user's typed input.

#### Scenario: GIPHY API is unreachable
- **WHEN** the picker's search or trending request to GIPHY fails
- **THEN** the system shows an error in the picker and the app continues to work

#### Scenario: Send acknowledgment fails
- **WHEN** sending a picked GIF fails
- **THEN** the system shows an inline error and keeps the user on the chat screen