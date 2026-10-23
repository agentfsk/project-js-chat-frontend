# Mediasoup Group Call Media Server

SFU (Selective Forwarding Unit) for encrypted group voice/video calls. Built on
[mediasoup](https://mediasoup.org/) v3 and Socket.IO.

## Architecture

```
Client (web/mobile)
   │  Socket.IO signaling (call registry, invites, mute/kick)
   ▼
Chat backend (project-js-chat-backend)
   │
   │  Socket.IO media signaling (create/join/transport/produce/consume)
   ▼
Media server (this repo)
   │  WebRTC (UDP/TCP 40000-40100)
   ▼
mediasoup Router ── Producers / Consumers ── Peers
```

One mediasoup `Router` is created per group call. Each peer gets a dedicated
send transport and receive transport. Audio/video/screen producers are forwarded
to every other peer through per-peer consumers.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Socket.IO / HTTP port |
| `MEDIASOUP_LISTEN_IP` | `0.0.0.0` | Interface mediasoup listens on |
| `MEDIASOUP_ANNOUNCED_IP` | `127.0.0.1` | Public IP announced in ICE candidates |
| `LOG_LEVEL` | `info` | pino log level |

RTC ports `40000-40100` must be open for UDP and TCP.

## Local development

```bash
pnpm install
pnpm dev        # tsx watch src/server.ts
```

Build and run:

```bash
pnpm build
pnpm start      # node dist/server.js
```

## Docker

```bash
MEDIASOUP_ANNOUNCED_IP=<public-ip> docker compose up -d --build
```

The compose file uses host networking so the RTC port range is reachable
without extra port mappings.

## Deployment (Oracle Cloud Free Tier)

> Render web services and Vercel cannot host this server: mediasoup requires
> public UDP ports (`40000-40100`) for RTP, while those platforms only expose
> HTTP(S) ports. Run the media server on a VPS and point the Vercel frontend at
> it through `VITE_MEDIA_SERVER_URL` (set before the Vercel build, then redeploy).

1. Create an ARM VM and open ingress rules for TCP `3001` and UDP/TCP
   `40000-40100` in the VCN security list and in the instance firewall
   (`ufw allow 3001`, `ufw allow 40000:40100/udp`, `ufw allow 40000:40100/tcp`).
2. Install Docker and clone this repository.
3. Set `MEDIASOUP_ANNOUNCED_IP` to the VM public IP, then run docker compose.
4. Point the web client at the server with
   `VITE_MEDIA_SERVER_URL=https://media.example.com` (or `http://<ip>:3001`).
5. Put the server behind TLS (nginx/caddy) when the web client is served over
   HTTPS, otherwise browsers block mixed-content WebSocket connections.

## Health checks and operations

- Logs go to stdout and to `./logs` when the compose volume is mounted.
- A call is cleaned up automatically when its last peer disconnects; routers,
  transports, producers and consumers are closed.
- `GROUP CALL` signaling events: `groupCallCreate`, `groupCallJoin`,
  `groupCallTransportConnect`, `groupCallProduce`, `groupCallConsume`,
  `groupCallPeerUpdate`, `groupCallMLSMessage`, `groupCallLeave`,
  `groupCallKick`.
