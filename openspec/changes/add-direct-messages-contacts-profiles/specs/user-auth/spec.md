# Spec Delta

## MODIFIED Requirements

### Requirement: Session identity is the user's nickname
The system SHALL identify the authenticated user by their current nickname in the chat regardless of whether they logged in with email or nickname, and SHALL keep history attributed to the current nickname after a rename.

#### Scenario: Login by email shows the nickname in chat
- **WHEN** a user logs in with their email
- **THEN** the messages that user sends are attributed to their nickname, not their email