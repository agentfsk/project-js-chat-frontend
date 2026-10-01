# Spec Delta

## MODIFIED Requirements

### Requirement: Send a contact request from a profile
The system SHALL let the user send a contact request to any other user from that user's profile, and SHALL notify the recipient in real time. It SHALL not create duplicate pending requests for the same pair.

#### Scenario: Request is sent
- **WHEN** the user clicks "Добавить в контакты" on another user's profile
- **THEN** the recipient receives the request in real time and the sender's profile action reflects that the request was sent

#### Scenario: Duplicate request is prevented
- **WHEN** a pending request to the same user already exists
- **THEN** the system does not create a second request and the profile shows the request as already sent

#### Scenario: The outgoing request is not a dead end
- **WHEN** the user has sent a pending contact request to a peer and opens the private chat with that peer from the «личные» section
- **THEN** the chat title and sidebar entry resolve the peer's real nickname and avatar from the outgoing request, and the peer's profile still shows the request as already sent