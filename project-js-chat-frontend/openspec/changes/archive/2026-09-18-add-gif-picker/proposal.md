# Proposal

## Why

The messenger has no way to express reactions or humour; users want to send GIFs. The message flow already supports attachments that render as images, so GIF sending can ride on the existing `attachment` channel with only a picker UI and a GIPHY API client to add.

## What Changes

- Add `src/api/giphy.ts`: a thin typed client for the GIPHY public API (search + trending), called directly from the browser with the public beta key; failures surfaced as errors, never as crashes.
- Add a custom `GifPicker` modal component (`src/components/GifPicker.tsx`) that reuses the existing `Modal`: shows trending GIFs on open, a debounced search field, a thumbnail grid (`preview_gif`), and loading / empty / error states.
- Add a GIF button to `MessageForm` next to the file-attach button that opens the picker; selecting a GIF closes the picker and sends the GIF as a realtime message.
- Sending a GIF = emitting `newMessage` with an empty body and an `attachment` whose `url` is the external GIPHY CDN URL (`mime: 'image/gif'`). No backend change: the backend stores and broadcasts `attachment` as-is, and the existing image attachment view renders it.
- Extend `src/index.css` with picker layout styles (grid, thumbnails, GIF button) reusing existing CSS variables.

## Capabilities

### New Capabilities
- `gif`: Let users pick a GIF from a GIPHY-powered picker and send it to a channel as a realtime image message.

### Modified Capabilities
<!-- None: the existing `chat` requirements already cover attachment delivery and rendering; this change only adds a new way to produce an attachment. -->

## Impact

- **Code**: new `src/api/giphy.ts` and `src/components/GifPicker.tsx`; edited `src/components/MessageForm.tsx` and `src/index.css`. No store or socket changes.
- **API**: consumes the public GIPHY API (`api.giphy.com/v1/gifs/search|trending`) from the browser with the beta key, valid on `localhost` only; the existing `/api` proxy and backend are untouched.
- **Dependencies**: none added (plain `fetch`).
- **Config**: no change.