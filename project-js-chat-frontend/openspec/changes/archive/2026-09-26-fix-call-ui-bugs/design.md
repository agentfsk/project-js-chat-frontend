# Design

## Context

Frontend and backend are separate repos (`project-js-chat-frontend`, `project-js-chat-backend`). Users reach private chats through the «личные» sidebar; opening a chat resolves its peer against a `profiles` map seeded at login. Calls use a socket-event signalling layer (backend `routes.js`) in front of WebRTC (frontend `webrtc.ts` / `callManager.ts`). See proposal.md — Why for the motivation behind this change.

## Goals / Non-Goals

**Goals:**
- Make the DM title, sidebar entry, and avatar action behave correctly for peers who are not yet accepted contacts.
- Surface the requester's own pending outgoing contact requests so their DM with that peer resolves too.
- Show/hide the remote video placeholder from negotiated state so camera-off yields a placeholder (not a stale frame) and camera-on resumes.
- Release both sides from call state when one side's connection drops, so the peer is not left busy.

**Non-Goals:**
- No new capabilities, no WebRTC call-connectivity rework (that landed in `fix-call-media`).
- No re-architecture of profile storage; only the seeding inputs change.

## Decisions

1. **Seed non-contact profiles from request payloads.** `setInitialData(me, contacts, requests, outgoingRequests)` builds one `profiles` record from `me`, `contacts`, each incoming `requests[].from`, and each outgoing `outgoingRequests[].to`. The DM title and row resolve `profiles[peerId]` exactly as they do for contacts, so no placeholder path exists for non-contacts. *Alternative:* fetch each unknown peer by id at render time — rejected: extra requests, N+1, and divergence from the existing single-load pattern.

2. **Backend returns outgoing requests in the initial data.** The data endpoint's response gains `outgoingRequests: [{ id, to, channelId, status }]`, where `to` is the full peer profile. *Alternative:* a separate "my requests" endpoint — rejected: the initial payload already round-trips the same bucket of data once.

3. **Title shows the peer's nickname, not the channel name.** `ChatPage` renders `peerProfile.username` (falling back to `channel.name` when no profile) instead of always `channel.name`, which for a non-contact is a generated placeholder. The row shows the nickname with a «не в контактах» badge when the peer is absent from `contacts`. *Alternative:* keep `channel.name` and only add the badge — rejected: the visible title stayed wrong for non-contacts.

4. **The row avatar opens the existing ProfileModal.** The DM row's avatar button becomes a real affordance (open profile → «Добавить в контакты») rather than being inert for non-contacts.

5. **Remote video derives from receiving transceivers.** `updateRemoteMedia` reports remote video active when **any** video transceiver has `currentDirection === null` or contains `'recv'`. *Alternative:* inspect the first video transceiver — rejected: each side's own camera is added as a `sendonly` transceiver first, so "first video transceiver" reports the local camera and the remote-video state was wrong (no placeholder on camera-off, frozen frame on a dead element).

6. **Call cleanup keyed to socket ids.** `callOffer`/`callAnswer` store `callerSocketId`/`calleeSocketId`; the backend's disconnect handler ends a call by the exact socket id, emits `callEnded { reason: 'disconnected' }` to the remaining peer's socket, clears the room and busy flag. *Alternative:* the pre-fix cleanup keyed on `userId + room` — rejected: it left the interrupted peer in the busy state and never matched the requester-after-reload case.

## Risks / Trade-offs

- [Profile data in `outgoingRequests` can grow stale if the peer edits their profile before accepting] → Mitigation: same behavior as contacts; profiles refresh on the next data load.
- [Direction-based remote-video check reads during an in-flight renegotiation] → Mitigation: only affects the placeholder's presence momentarily; connectivity and candidate ordering are owned by `fix-call-media`'s negotiation queue.
- [Disconnect cleanup racing a new call start from the same user] → Mitigation: cleanup is scoped to the recorded socket id; a fresh call creates a new room and socket binding.
- [Larger initial-data payload] → Mitigation: bounded by the count of pending outgoing requests, which is small.

## Migration Plan

Additive only. Backend: response gains one array field — no schema change for consumers that ignore unknown fields. Frontend: behavior change rides the same data load. Rollback: revert the two commits (`d6a9551`, `67901f0`); no data migration.

## Open Questions

None.