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

Group voice/video calls use an SFU media server (`project-js-media-server`)
instead of a P2P mesh.

```
GroupInfoModal ──POST /api/v1/group-calls──▶ Chat backend (call registry, invites)
      │                                              │
      └─ createMediaCall (Socket.IO) ──▶ Media server (mediasoup router)
                                                     │
GroupCallScreen ── join/produce/consume ─────────────┘
```

- `src/groupCall/GroupCallEngine.ts` — mediasoup-client device, transports,
  producers, consumers and SFrame key derivation.
- `src/groupCall/mediaServer.ts` — Socket.IO client for the media server.
- `src/groupCall/GroupCallScreen.tsx` — join flow, grid/speaker view,
  microphone/camera/screen-share controls, participant management.
- `src/groupCall/persistence.ts` — best-effort persistence of call metadata
  (epoch, group id, key id). Raw media/MLS keys are never written to storage.
- Active calls are included in `/api/v1/data` so the "join" banner appears as
  soon as any group member starts a call.

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_BACKEND_URL` | same origin | Chat backend URL |
| `VITE_MEDIA_SERVER_URL` | `http://localhost:3001` | Media server URL |

### Deployment (Vercel + Render)

Vite inlines environment variables at build time, so set both variables in the
Vercel project settings **before** building and trigger a new deployment after
changing them. Copy `.env.example` for a local setup.

1. The chat backend runs on Render (or any Node host with WebSocket support).
   Set `VITE_BACKEND_URL` to its public URL, e.g. `https://api.example.com`.
2. The media server cannot run on Render web services: mediasoup needs public
   UDP ports `40000-40100` for RTP. Deploy it to a VPS (see
   `project-js-media-server/README.md`) and expose it over TLS.
3. Set `VITE_MEDIA_SERVER_URL` to the media server URL, e.g.
   `https://media.example.com`. HTTPS is required when the web app is served
   over HTTPS, otherwise the browser blocks the insecure WebSocket connection.
4. Redeploy the frontend after changing either variable.

Verify in the browser console: no `[config] VITE_MEDIA_SERVER_URL is not set`
message, and the media server handshake succeeds when starting a call.

### MLS key management

MLS group state is managed by `ping-openmls-sdk`. Identity keys and group state
are stored in the browser's secure storage layer; the app-level persistence only
keeps the group id, epoch and local key id so a reloaded call can be resumed.
When a member joins or leaves, the MLS epoch advances and SFrame keys are
re-derived from the new epoch secret. Keys are never sent to the SFU.
