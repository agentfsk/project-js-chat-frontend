# Spec Delta

## MODIFIED Requirements

### Requirement: Report when a call cannot connect
The system SHALL inform the caller when a call cannot connect or is not answered: when the peer is offline, when the peer is already in another call, or when the call is not answered within the ringing timeout, SHALL not deliver a call to an offline peer, and SHALL notify the caller when the peer declines.

#### Scenario: Peer is offline
- **WHEN** the caller starts a call with a peer who is offline
- **THEN** the call ends immediately and the caller is informed that the peer is not available

#### Scenario: Peer is busy
- **WHEN** the caller starts a call with a peer who is already in another call
- **THEN** the call ends immediately and the caller is informed that the peer is busy

#### Scenario: No answer within the timeout
- **WHEN** the peer does not accept within the ringing timeout
- **THEN** the call ends and the caller is informed that there was no answer

#### Scenario: Peer declines
- **WHEN** the peer declines an incoming call
- **THEN** the caller is informed that the peer declined the call

#### Scenario: Connection drops during a call
- **WHEN** either participant's connection drops (for example, the page is reloaded or the browser is closed) while a call is ringing or active
- **THEN** the call ends on both sides, the interrupted participant's call UI closes, and the remaining peer is no longer busy so a new call can be started immediately