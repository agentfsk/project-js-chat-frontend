# Proposal

## Why

The messenger can only exchange plain text. Users want to attach files to messages — PNG images, text files, and similar — so a chat between people can share documents and pictures.

## What Changes

- Add a backend upload endpoint `POST /api/v1/uploads` (multipart) that validates file type and size, stores the file on disk, and returns `{ name, mime, size, url }`; served files are accessible under `/uploads/*`.
- Messages gain an optional `attachment` metadata field. The socket `newMessage` handler already passes payload fields through (`{...message, id}`), so attachments flow to `/data` and broadcasts without handler changes.
- The composer gains a file button; sending a message with a file uploads it first, then emits `newMessage` with the attachment metadata. A message may contain an attachment without a text body.
- Messages with an image attachment render as a preview; other types render as a downloadable chip (filename + size).
- Frontend dev proxy forwards `/uploads` to the backend so everything stays same-origin.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `chat`: Adds requirements for attaching files to messages, real-time delivery of attachments, and rendering/preview of attachments.

## Impact

- **Code (backend, `../project-js-chat-backend`)**: `src/plugin.js` registers `@fastify/multipart` and `@fastify/static`; `src/routes.js` adds `POST /api/v1/uploads`; new `uploads/` directory.
- **Code (frontend)**: `src/types.ts`, new `src/api/uploads.ts`, `src/components/MessageForm.tsx`, `src/components/MessageList.tsx`, `vite.config.ts` (`/uploads` proxy).
- **API**: new `POST /api/v1/uploads` and static `GET /uploads/*` on the backend; message objects now may carry `attachment`.
- **Dependencies**: adds `@fastify/multipart` and `@fastify/static` (backend).