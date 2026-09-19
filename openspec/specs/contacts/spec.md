# contacts Specification

## Purpose

Lets users find one another by nickname and build a contact list: searching returns matching public profiles, users can send contact requests, and recipients accept or decline them directly above a chat, turning accepted pairs into mutual contacts.

## Requirements

### Requirement: Search users by nickname
The system SHALL let the user search for other users by a full or partial nickname, match without regard to letter case, and SHALL return matching public profiles (nickname and avatar) excluding the current user.

#### Scenario: Search finds matches
- **WHEN** the user types a nickname or part of it into search
- **THEN** the system shows the matching users' profiles with their nicknames and avatars

#### Scenario: Search has no results
- **WHEN** the user searches for text that matches no other user
- **THEN** the system shows an empty state without crashing

#### Scenario: Self is excluded
- **WHEN** the user searches for their own nickname
- **THEN** the search results do not include the current user's profile

### Requirement: Send a contact request from a profile
The system SHALL let the user send a contact request to any other user from that user's profile, and SHALL notify the recipient in real time. It SHALL not create duplicate pending requests for the same pair.

#### Scenario: Request is sent
- **WHEN** the user clicks "Добавить в контакты" on another user's profile
- **THEN** the recipient receives the request in real time and the sender's profile action reflects that the request was sent

#### Scenario: Duplicate request is prevented
- **WHEN** a pending request to the same user already exists
- **THEN** the system does not create a second request and the profile shows the request as already sent

### Requirement: Recipient accepts or declines a contact request
The system SHALL show the recipient of a contact request a chat with the sender and a banner above it: "Пользователь \<nickname\> хочет добавить вас в контакты" with accept and decline actions. The banner SHALL appear regardless of whether a chat between the two already existed. Accepting SHALL make the contact mutual for both users; declining SHALL remove the request.

#### Scenario: Banner appears with a new chat
- **WHEN** a user receives a contact request from someone they have no chat with
- **THEN** a chat entry with the sender appears in their «личные» and the banner with accept/decline shows above the chat

#### Scenario: Banner appears with an existing chat
- **WHEN** a user receives a contact request from someone they already chat with
- **THEN** the banner with accept/decline shows above the already-existing chat

#### Scenario: Accept the request
- **WHEN** the recipient clicks the accept action on the banner
- **THEN** the banner disappears and both users appear in each other's contact lists

#### Scenario: Decline the request
- **WHEN** the recipient clicks the decline action on the banner
- **THEN** the banner disappears, the requester is not added as a contact, the chat remains available, and the requester can send a new request later

### Requirement: Manage the contact list
The system SHALL list the user's accepted contacts in the «личные» section, opening a chat with a contact on click, and SHALL let the user remove a contact.

#### Scenario: Contact opens the chat
- **WHEN** the user clicks an accepted contact in the «личные» section
- **THEN** the private chat with that contact opens and messages can be exchanged

#### Scenario: Remove a contact
- **WHEN** the user removes a contact from the «личные» section
- **THEN** the contact disappears from the user's contact list and the user is no longer listed in that contact's list