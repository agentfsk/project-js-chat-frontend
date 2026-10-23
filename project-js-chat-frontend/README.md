# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Group calls (web)

Group voice/video calls use a peer-to-peer WebRTC mesh over the same Socket.IO
signaling as regular 1:1 calls, so no separate media server is required.

```
GroupInfoModal ──POST /api/v1/group-calls──▶ Chat backend (call registry, invites)
                                                     │
GroupCallScreen ── groupCallJoin / groupCallSignal ──┘
      │
      └─ RTCPeerConnection per participant (STUN + DTLS-SRTP)
```

- `src/groupCall/MeshGroupCallEngine.ts` — one `RTCPeerConnection` per remote
  participant. The peer that joins later creates the offer; SDP/ICE are
  relayed through the chat backend. Mute/camera/screen-share state is relayed
  separately as participant updates.
- `src/groupCall/GroupCallScreen.tsx` — join flow, grid/speaker view,
  microphone/camera/screen-share controls, participant management.
- `src/groupCall/GroupCallEngine.ts` and `mediaServer.ts` — optional mediasoup
  SFU path kept for future scaling; the default flow does not use them.
- `src/groupCall/persistence.ts` — best-effort persistence of call metadata
  (epoch, group id, key id). Raw media/MLS keys are never written to storage.
- Active calls are included in `/api/v1/data` so the "join" banner appears as
  soon as any group member starts a call.

Mesh calls are intended for small groups (roughly up to 6 participants):
each peer uploads its media to every other peer. Media is encrypted in transit
by WebRTC DTLS-SRTP; MLS/SFrame end-to-end encryption is still on the roadmap.
Only STUN is configured, exactly like 1:1 calls, so symmetric NAT users may
need a TURN server.

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_BACKEND_URL` | same origin | Chat backend URL |
| `VITE_MEDIA_SERVER_URL` | `http://localhost:3001` | Optional SFU media server |

### Deployment (Vercel + Render)

Vite inlines environment variables at build time, so set them in the Vercel
project settings **before** building and trigger a new deployment after
changing them. Copy `.env.example` for a local setup.

1. The chat backend runs on Render (or any Node host with WebSocket support).
   Set `VITE_BACKEND_URL` to its public URL, e.g. `https://api.example.com`.
2. Group calls work without any additional infrastructure: browsers connect to
   each other directly, using Render only for signaling.
3. `VITE_MEDIA_SERVER_URL` is optional and only needed if you later switch to
   the SFU engine. mediasoup cannot run on Render/Vercel because it needs public
   UDP ports `40000-40100`; it must run on a VPS (see
   `project-js-media-server/README.md`).
4. Redeploy the frontend after changing either variable.

### MLS key management (roadmap)

The group-calls change includes MLS/SFrame end-to-end encryption via
`ping-openmls-sdk`, but the web client does not wire it into the media path yet:
current calls rely on WebRTC DTLS-SRTP. When enabled, identity keys and group
state will live in the browser's secure storage layer, while the app-level
persistence keeps only the group id, epoch and local key id so a reloaded call
can be resumed. On join/leave the MLS epoch advances and SFrame keys are
re-derived from the new epoch secret; keys are never sent to the SFU.
