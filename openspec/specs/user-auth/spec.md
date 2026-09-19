# user-auth Specification

## Purpose

Authenticates messenger users against the backend so only recognized participants enter the chat, using an account model of email, nickname and password, and lets users sign in with either their email or their nickname.

## Requirements

### Requirement: Registration requires email, nickname and password
The system SHALL require an email, a nickname and a password to create an account, and SHALL reject registration when the email is not in a valid format, the email is already used, or the nickname is already used.

#### Scenario: Successful registration
- **WHEN** the user submits a valid email, a unique nickname and a password on the signup form
- **THEN** the system stores the returned token in localStorage, preserves the nickname as the session username, and displays the chat screen

#### Scenario: Email already used
- **WHEN** the user submits an email that is already registered and the backend responds with 409
- **THEN** the system displays an error message saying the email is already used, without leaving the signup form

#### Scenario: Nickname already used
- **WHEN** the user submits a nickname that is already taken and the backend responds with 409
- **THEN** the system displays an error message saying the nickname is already taken, without leaving the signup form

#### Scenario: Invalid email format
- **WHEN** the user submits an email that does not match a valid email format
- **THEN** the system shows an inline validation error and does not submit the form

### Requirement: Login accepts email or nickname
The system SHALL let the user log in with either the registered email or the registered nickname, together with the password.

#### Scenario: Login by email
- **WHEN** the user submits their registered email and the correct password
- **THEN** the system stores the returned token and the user's nickname in localStorage and displays the chat screen

#### Scenario: Login by nickname
- **WHEN** the user submits their registered nickname and the correct password
- **THEN** the system stores the returned token in localStorage and displays the chat screen

#### Scenario: Invalid credentials
- **WHEN** the user submits an email or nickname with a wrong password and the backend responds with 401
- **THEN** the system displays an error message without leaving the login form

### Requirement: Session identity is the user's nickname
The system SHALL identify the authenticated user by nickname in the chat regardless of whether they logged in with email or nickname.

#### Scenario: Login by email shows the nickname in chat
- **WHEN** a user logs in with their email
- **THEN** the messages that user sends are attributed to their nickname, not their email