# Tasks

## 1. Backend upload support

- [x] 1.1 Add `@fastify/multipart` and `@fastify/static` to the backend `package.json` via `pnpm add` and verify the install resolves in lockfile and the server still starts
- [x] 1.2 Register the two plugins and create the `uploads/` directory: `@fastify/multipart` (files: 1, fileSize: 5 MB), `@fastify/static` at prefix `/uploads` rooted at the backend `uploads/` dir, and verify the server boots with no registration errors
- [x] 1.3 Implement `POST /api/v1/uploads`: read one multipart file, validate MIME against the allowlist, save it as `<timestamp>-<uuid>.<ext>` in `uploads/`, reply `{ name, mime, size, url }`, and verify via curl that a PNG and a text file upload and return the metadata
- [x] 1.4 Verify error handling: an unsupported type returns 400 with an error body, and a file over the limit returns a non-2xx, via curl
- [x] 1.5 Verify `@fastify/static` serves the uploaded file by URL and returns the right Content-Type, via curl

## 2. Frontend upload plumbing

- [x] 2.1 Extend `Message` in `src/types.ts` with optional `attachment: { name, mime, size, url }` and verify the project still type-checks
- [x] 2.2 Add `src/api/uploads.ts` with an `uploadFile(file)` helper posting FormData to `/api/v1/uploads` and returning the attachment metadata, and verify a build passes
- [x] 2.3 Add `/uploads` to the Vite dev proxy targeting `http://localhost:5001`, and verify a served file URL from step 1.5 is reachable through `http://localhost:5173/uploads/...`
- [x] 2.4 Add `src/utils/format.ts` with a human-readable bytes formatter and verify it formats KB/MB correctly

## 3. Composer

- [ ] 3.1 Add a file picker button and hidden `<input type="file">` to `MessageForm`, show a chip with the chosen file name, and verify picking and clearing a file work
- [x] 3.2 On submit: if a file is pending, upload it first (disable the send controls while uploading), then emit `newMessage` with the attachment; allow sending with empty body when a file is attached, and verify a message with attachment appears
- [ ] 3.3 Handle upload errors (too large, unsupported type, network) by storing an inline error and not sending the message; verify each case shows the error

## 4. Rendering

- [ ] 4.1 Render image attachments (`mime` starts with `image/`) as a clickable `<img>` preview inside the message, and verify an attached PNG shows the preview
- [ ] 4.2 Render non-image attachments as a chip with the display name and formatted size linking to the file with a download attribute, and verify clicking downloads the file

## 5. Verification

- [x] 5.1 Run `pnpm lint` and `pnpm build` in the frontend and verify both pass; verify the backend still starts cleanly
- [ ] 5.2 With both servers running: in two tabs, attach a PNG and a text file, and verify both participants see the attachment (preview/download) in real time
- [ ] 5.3 Verify the unsupported-type and oversize cases show inline errors in the UI without sending a message