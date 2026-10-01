# Spec Delta

## Purpose

Lets users carry an editable identity in the messenger: every user has a public profile with a nickname and optional avatar, other users can open it, and the profile owner can change the nickname and the avatar.

## ADDED Requirements

### Requirement: View another user's profile
The system SHALL open a profile view for any discovered user showing their current nickname and avatar (an initial-based placeholder when no avatar is set).

#### Scenario: Open profile from search
- **WHEN** the user opens a search result
- **THEN** the system shows that user's profile with their nickname and avatar

#### Scenario: Avatar placeholder
- **WHEN** the viewed user has no avatar
- **THEN** the system shows the nickname's initial as a placeholder avatar

### Requirement: Edit own nickname
The system SHALL let the user change their nickname from their own profile, keep the new nickname as the session identity, re-attribute their message history to it, and SHALL reject a nickname already used by another user with a 409 error.

#### Scenario: Rename succeeds
- **WHEN** the user submits an unused nickname from their profile editor
- **THEN** the new nickname becomes the session identity and appears on the user's profile and in their messages

#### Scenario: Rename conflicts
- **WHEN** the user submits a nickname already used by another user and the backend responds with 409
- **THEN** the system shows an error saying the nickname is already taken and keeps the editor on screen

### Requirement: Set and remove an avatar
The system SHALL let the user set an avatar by uploading an image through the backend, and SHALL let the user remove it. The avatar appears on their profile and next to their messages and chat entries.

#### Scenario: Upload an image avatar
- **WHEN** the user picks a supported image file as their avatar
- **THEN** the image is uploaded through the backend and shown on the profile as the current avatar

#### Scenario: Reject a non-image avatar
- **WHEN** the user picks a file whose type is not a supported image
- **THEN** the system rejects the file and shows an error without changing the avatar

#### Scenario: Remove the avatar
- **WHEN** the user removes the current avatar
- **THEN** the profile shows the initial-based placeholder again