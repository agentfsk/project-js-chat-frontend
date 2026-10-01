# Design

## Context

The messenger already has a complete attachment pipeline (see proposal.md - Why): `MessageForm` uploads files and emits `newMessage` with an `attachment` `{ name, mime, size, url }`; the backend (`project-js-chat-backend`) stores and broadcasts the payload as-is without validating the attachment's origin; `MessageList` renders any `image/*` attachment as an inline `<a><img src={url}>` via `AttachmentView`. A GIF from GIPHY is therefore just a new producer of an existing attachment shape.

App conventions: Vite/React 19 + TypeScript, zustand stores, plain `fetch`, hardcoded Russian UI strings, minimal dependencies, no test framework (verification via `pnpm lint` + `pnpm build` and manual browser runs). Existing `Modal` component is reused for overlays (see `ChannelInputModal`). GIPHY API access requires a key; the project's teaching scope accepts the public beta key (`dc6zaTOxFJmzC`), which is restricted to `localhost`.

## Goals / Non-Goals

**Goals:**
- Ship a working GIF picker with search and trending, wired into the existing composer, with zero backend changes and zero new runtime dependencies.
- Reuse the message-attachment path so no store or socket changes are needed.

**Non-Goals:**
- No GIF upload/re-hosting on our backend — the sent message references the GIPHY CDN URL directly.
- No GIF captions: a picked GIF is a standalone message with an empty text body.
- No pagination or category browsing in the picker (single page, `limit=25`).
- No stickers library, GIF upload from user devices, or non-GIPHY sources.
- No production-grade API key management; the beta key leaks into the bundle and works only on `localhost`.

## Decisions

- **Direct browser fetch to GIPHY** over a backend proxy. The GIPHY public API (`api.giphy.com/v1/gifs/search` and `/trending`, `rating=g`) supports CORS and works fine from the browser. A proxy would require a backend change (out of scope) to hide a key we do not treat as secret in this teaching context. The GIPHY calls deliberately bypass `apiRequest` (which would rewrite to the `/api` proxy and attach the auth header).
- **External GIPHY URL as the message attachment** over download-and-reupload. A selected GIF produces `attachment = { name, mime: 'image/gif', size, url: <media.giphy.com URL> }` and is sent via the existing `emitNewMessage`. This is instant (no upload round-trip), avoids the backend's 5 MB upload cap (GIPHY originals exceed it), needs no backend change, and the existing `AttachmentView` renders it with no edits.
- **Custom picker** over `@giphy/react-components`. The GIPHY SDK brings `@giphy/js-fetch-api` plus `@emotion/*` peers and its own styling, clashing with the project's minimal custom-UI direction; a hand-rolled picker (search input + thumbnail grid inside the existing `Modal`) is ~100 lines and matches the current design language.
- **`preview_gif` for the browsing grid, `downsized` for the sent GIF.** Thumbnails render fast in the picker; the committed GIF uses the `downsized` variant (capped ~8 MB, good frame size) referenced by URL so no size limit applies to the actual delivery.
- **Debounced search (`setTimeout` ~300 ms)** with the request cancelled on unmount/out-of-order guard, trending loaded on open. GIPHY failures set an inline error in the picker; nothing is sent on failure.
- **Standalone-message sending**: a picked GIF clears the composer text and sends `body: ''` with the attachment. The existing `canSubmit` accepts a bodyless message when an attachment is present, so no composer logic change is needed beyond opening/closing the picker.
- **RU strings, "Powered by GIPHY" attribution** in the picker footer (GIPHY API usage terms).

## Risks / Trade-offs

- [Beta key works only on `localhost`] → Acceptable for the teaching/demo scope; noted in the design and tasks; swap for a registered key later is a one-line change in `src/api/giphy.ts`.
- [Messages depend on GIPHY CDN availability] → A sent GIF is a URL reference; if GIPHY is down, the image link 404s like any external resource. Accepted for a teaching messenger.
- [No size guard for sent GIFs since not uploaded] → `downsized` variant keeps payloads reasonable; the picker thumbnails are tiny.
- [GIPHY CORS/rate limits] → Search failures surface as an inline picker error, never a crash; users keep their typed input.
- [GIFs carry GIPHY licensing] → Teaching context; attribution requirement covered by the "Powered by GIPHY" footer in the picker.