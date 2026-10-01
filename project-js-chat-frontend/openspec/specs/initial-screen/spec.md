# initial-screen Specification

## Purpose

Lets the frontend verify that it can reach the chat backend before the full messenger is built, by rendering an initial screen with a connectivity check.

## Requirements

### Requirement: Initial screen renders a greeting
The system SHALL render a greeting and a "Check connection" button on page load.

#### Scenario: Greeting is visible
- **WHEN** the user opens the app
- **THEN** the system displays a greeting and a "Check connection" button

### Requirement: Backend connectivity check
The system SHALL verify backend connectivity by posting `admin`/`admin` credentials to the login endpoint through the `/api` proxy, and SHALL show the result on the screen.

#### Scenario: Backend responds successfully
- **WHEN** the user clicks the "Check connection" button and the login endpoint returns a token
- **THEN** the system displays the returned username and token

#### Scenario: Backend is unavailable
- **WHEN** the user clicks the "Check connection" button and the login request fails
- **THEN** the system displays an error message instead of crashing

#### Scenario: Invalid credentials
- **WHEN** the user clicks the "Check connection" button and the login endpoint rejects the credentials
- **THEN** the system displays the authentication error