# Spec Delta

## Purpose

Lets users authenticate against the backend so that only recognized participants can enter the chat and the app knows who is sending each message.

## ADDED Requirements

### Requirement: Login screen shown when unauthenticated
The system SHALL render a login and signup form when no token is stored in the browser.

#### Scenario: No token on start
- **WHEN** the user opens the app and no token is present in localStorage
- **THEN** the system displays a login form and a link or button to switch to the signup form

### Requirement: Successful login stores token
The system SHALL call the backend login endpoint and, on success, persist the returned token and transition to the chat screen.

#### Scenario: Valid credentials
- **WHEN** the user submits correct username and password
- **THEN** the system stores the returned token in localStorage and displays the chat screen

### Requirement: Successful signup stores token
The system SHALL call the backend signup endpoint and, on success, persist the returned token and transition to the chat screen.

#### Scenario: Unique username
- **WHEN** the user submits a username not yet taken and a password
- **THEN** the system stores the returned token in localStorage and displays the chat screen

### Requirement: Failed login shows error
The system SHALL display an error message when the backend rejects the login credentials.

#### Scenario: Wrong credentials
- **WHEN** the user submits an invalid username or password and the backend responds with 401
- **THEN** the system displays an error message without leaving the login form

### Requirement: Duplicate username shows error
The system SHALL display an error message when the signup username is already taken.

#### Scenario: Username already exists
- **WHEN** the user submits a username that already exists and the backend responds with 409
- **THEN** the system displays an error message without leaving the signup form

### Requirement: Token cleared on backend rejection
The system SHALL clear the stored token and return to the login screen when the backend rejects a request due to an invalid or expired token.

#### Scenario: 401 on data fetch
- **WHEN** the stored token is rejected with 401 when loading chat data
- **THEN** the system removes the token from localStorage and displays the login screen
