# emoji Specification

## Purpose

Lets users pick emojis from a Telegram-like panel in the message composer: a category tab strip with icon badges, a History section of previously used emojis, native-text insertion into the message body, and a bilingual (Russian and English) search.

## Requirements

### Requirement: Open and close the emoji picker from the composer
The system SHALL provide an emoji button in the message composer that opens a picker panel above the message input, and SHALL close the panel when the user clicks outside it or presses Escape.

#### Scenario: Open the picker
- **WHEN** the user clicks the emoji button in the composer
- **THEN** a picker panel with a search field, emoji grid, and category tabs opens above the message input

#### Scenario: Close on outside click
- **WHEN** the emoji picker is open and the user clicks anywhere outside the picker
- **THEN** the picker closes and the message input keeps its content

#### Scenario: Close on Escape
- **WHEN** the emoji picker is open and the user presses Escape
- **THEN** the picker closes and the message input keeps its content

### Requirement: Browse emojis by category
The system SHALL display emojis grouped into categories, each selectable through a tab showing a representative icon, with the category tabs ordered Telegram-style: the History section of previously used emojis first, the main Smileys & People pack second, then the remaining categories.

#### Scenario: History is the first tab
- **WHEN** the user opens the picker and has previously used emojis
- **THEN** the first tab shows the previously used emojis, newest first

#### Scenario: Default pack after History
- **WHEN** the user opens the picker and the History section is empty or is not selected
- **THEN** the Smileys & People category is shown as the default content

#### Scenario: Switch categories by icon
- **WHEN** the user clicks a category tab icon other than the active one
- **THEN** the grid shows the emojis of the selected category and the tab is marked active

### Requirement: Insert a picked emoji into the message text
The system SHALL insert the picked emoji as a native Unicode character into the message input at the cursor position without sending the message, leaving the rest of the typed text intact and keeping focus in the input.

#### Scenario: Insert at the cursor
- **WHEN** the user places the cursor in the message text and clicks an emoji
- **THEN** the emoji is inserted at the cursor position and the surrounding text is preserved

#### Scenario: Insertion does not send
- **WHEN** the user clicks an emoji in the picker
- **THEN** no message is sent; the composer only records the pick and the message is sent when the user submits it

### Requirement: Track recently used emojis
The system SHALL record every picked emoji, show them in the History tab ordered newest-first with duplicates collapsed, cap the list at a fixed size, and keep the list across page reloads.

#### Scenario: Recently used appears first
- **WHEN** the user picks an emoji and opens the picker again
- **THEN** the picked emoji appears at the front of the History tab

#### Scenario: Duplicates are collapsed
- **WHEN** the user picks the same emoji repeatedly
- **THEN** the emoji appears once in History, moved to the front

#### Scenario: History is capped
- **WHEN** the number of recorded emojis exceeds the list cap
- **THEN** the oldest emojis beyond the cap are dropped from History

#### Scenario: History persists across reloads
- **WHEN** the user reloads the page after picking emojis
- **THEN** the same History list is shown in the picker

### Requirement: Search emojis in Russian and English
The system SHALL filter the emoji grid by a match of the entered query against each emoji's Russian and English names, SHALL show an empty state when nothing matches, and SHALL restore the category grid when the query is cleared.

#### Scenario: Search by Russian name
- **WHEN** the user types a Russian query such as "улыбка" in the picker's search field
- **THEN** the grid shows emojis whose Russian names match the query

#### Scenario: Search by English name
- **WHEN** the user types an English query such as "smile" in the picker's search field
- **THEN** the grid shows emojis whose English names match the query

#### Scenario: Search has no results
- **WHEN** the user searches for a query with no matching emoji
- **THEN** the picker shows an empty state without crashing

#### Scenario: Clearing the search restores categories
- **WHEN** the user clears the search query
- **THEN** the picker shows the previously selected category grid again