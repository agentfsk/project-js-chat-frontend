# Spec Delta

## REMOVED Requirements

### Requirement: Initial screen renders a greeting
**Reason**: The greeting screen is superseded by the authentication screen; the login form is now the first thing users see.
**Migration**: None — the greeting and check-connection button are no longer part of the user experience.

### Requirement: Backend connectivity check
**Reason**: The connectivity check button is replaced by the login and signup flows, which themselves verify that the backend is reachable; a dedicated check button is no longer needed.
**Migration**: None — backend reachability is now tested implicitly when the user logs in or signs up.