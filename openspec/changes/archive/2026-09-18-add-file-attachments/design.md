# Design

## Context

The chat backend (Fastify + Socket.IO on `http://localhost:5001`, no OpenSpec, run via `fastify start`) currently has no file support: no multipart plugin, no static serving, and messages are `{ id, body, channelId, username }`. Its socket `newMessage` handler stores `{...message, id}` and broadcasts the whole object, so a client-supplied `attachment` field round-trips through the socket, in-memory state, and `GET /api/v1/data` untouched. The frontend sends messages via `emitNewMessage(body, channelId, username)` and renders them in `MessageList`. See proposal.md - Why.

## Goals / Non-Goals

**Goals:**
- Files uploaded once over REST, small metadata (`{ name, mime, size, url }`) carried in the message; no binary over the socket.
- Same-origin URLs: files served through the Vite `/uploads` proxy mirroring the existing `/api` pattern.
- Backend messages and `/data` stay compatible (attachment is optional, additive).

**Non-Goals:**
- No streaming/chunked upload, no video, no message-with-attachment editing/deletion, no per-user quota, no cleanup of orphaned files.
- No auth on the upload endpoint or static files (matches the backend's socket, which is also unauthenticated).

## Decisions

- **Upload endpoint on the backend** (`POST /api/v1/uploads`) over sending binaries through Socket.IO. Socket.IO's default `maxHttpBufferSize` (1 MB) would reject even medium images, and payloads would be ~33% larger as base64. The upload endpoint accepts multipart, writes to `uploads/`, and returns metadata; the socket only carries the small metadata reference.
- **`@fastify/multipart` with `limits.files: 1` and `fileSize` capped at 5 MB**; oversized uploads are rejected with a `413`-style error that the frontend surfaces inline. Alternative (no limit) rejected to keep the teaching server usable.
- **Allowlist by MIME type** (`image/png`, `image/jpeg`, `image/gif`, `image/webp`, `text/plain`, `text/markdown`, `application/json`, `text/csv`, `application/pdf`). The extension is taken from the original filename and validated against a matching map, so a `.png` with `image/png` is accepted and anything else is `400`. The value is used only to store the file; the served Content-Type is derived by `@fastify/static` from the file extension on disk.
- **Filename `<Date.now()>-<crypto.randomUUID()>.<ext>`** avoids overwrites and path traversal; the original display name is kept in `attachment.name`.
- **`@fastify/static` at prefix `/uploads`** serves the directory `path.join(process.cwd(), 'uploads')`. The frontend dev proxy adds `'/uploads'` → `http://localhost:5001`, so in dev everything stays same-origin (no CORS handling beyond the already-present `origin: '*'`).
- **Composer flow**: picking a file never sends anything on its own. On submit, if a file is pending, `POST /api/v1/uploads` (FormData) runs first; on success the stored metadata is attached to `newMessage`; on failure the store error is shown and the message is not sent/materialized. The send button is disabled while uploading. A message with an attachment may have an empty body.
- **Rendering by MIME**: `image/*` → `<img>` preview (clicking opens the file); everything else → chip with display name, human-readable size, and an anchor with `download`. Size formatting lives in a small util (`src/utils/format.ts`). `Message` type gains optional `attachment`.
- **No changes to `src/socket.ts` emit signature** beyond forwarding the extra field; `emitNewMessage` gains an optional `attachment` argument.

## Risks / Trade-offs

- [Upload succeeds but the socket emit fails] → orphan file remains in `uploads/`; accepted for a teaching server, no cleanup job (noted in Non-Goals).
- [Backend holds files in a process-local directory] → restart keeps files on disk but in-memory messages referencing them are lost, leaving unreachable URLs; accepted, matches the backend's in-memory design.
- [Unbounded `uploads/` growth] → no quota; accepted for the teaching workload, revisit if files are deleted by channel removal because disk cleanup was explicitly out of scope.
- [MIME sniffing on fastify multipart may differ from the browser's reported type] → allowed types are common and served Content-Type follows the on-disk extension, so preview/downloads stay consistent.

## Migration Plan

Backend: add deps, register plugins, create `uploads/`; restart the server — no data migration. Frontend: deploy together with the backend (proxy/type/composer/render); rollback is `git revert` of this change plus backend dep removal.