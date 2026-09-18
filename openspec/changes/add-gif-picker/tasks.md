# Tasks

## 1. GIPHY API module

- [x] 1.1 Create `src/api/giphy.ts` with types (`GiphyGif`, `images.preview_gif`/`downsized`), `searchGifs(query)` and `trendingGifs()` hitting `api.giphy.com/v1/gifs/search|trending` with the API key and `rating=g`, and verify a manual call in the browser devtools returns a list of GIF objects
- [x] 1.2 Ensure GIPHY failures reject with an error the caller can surface, and verify a blocked request (offline) rejects instead of throwing uncaught

## 2. Picker component

- [x] 2.1 Create `src/components/GifPicker.tsx` reusing `Modal`: trending grid on open, search input with ~300ms debounce, `preview_gif` thumbnails, loading / empty / error states, result guard for stale responses, and verify it renders and reacts to typing
- [x] 2.2 Add the "Powered by GIPHY" attribution footer in the picker, and verify it is visible alongside the grid

## 3. Composer wiring

- [x] 3.1 Add a GIF button to `MessageForm` (disabled while uploading) that opens `GifPicker`, and verify it opens and the attachment flow still works
- [x] 3.2 On GIF select, close the picker, clear composer text, emit `newMessage` with empty body and an `attachment { name, mime: 'image/gif', size, url: downsized.url }`, and verify the GIF appears in the message list of the active channel
- [x] 3.3 Surface send failures (failed ack) via the existing inline error, and verify no message is sent and the user stays on the chat screen

## 4. Styling

- [x] 4.1 Extend `src/index.css` with picker styles (grid, thumbnails, GIF button, footer) reusing existing CSS variables, and verify the layout renders sensibly in the chat screen
- [x] 4.2 Run `pnpm lint` and `pnpm build` and verify both pass

## 5. Verification

- [x] 5.1 With the backend running, open two `pnpm dev` tabs under the same account, send a GIF in a channel, and verify it appears in both tabs without a refresh
- [x] 5.2 Verify trending shows on picker open, search narrows results, and an unavailable GIPHY request shows the picker's error state without losing typed input