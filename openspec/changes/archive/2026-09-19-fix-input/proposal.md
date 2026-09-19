# Proposal

## Why

The composer input is a single-line `<input type="text">`, so when typing reaches the right edge the text scrolls horizontally instead of wrapping, and pressing Enter instantly sends the message. A messenger with Telegram-style authoring should wrap at the line end and let Enter create a new line — the way text composition works everywhere else.

## What Changes

- Replace the single-line `<input>` in the composer with an auto-growing `<textarea>`: idle at one row, grows with content up to a maximum height, then scrolls, and collapses back to one row after a message is sent.
- Pressing Enter inserts a line break and moves the cursor to the next line instead of sending.
- Sending happens only through the existing «Отправить» button; the submit eligibility logic (`body` or attachment present, not uploading) is unchanged.
- Multi-line message bodies render their line breaks in the message list (`white-space: pre-wrap` on the body text, keeping word breaking).
- Cursor-aware emoji insertion keeps working unchanged — `selectionStart`/`setSelectionRange` behave identically on a textarea.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `chat`: add a requirement covering multi-line composition — text wraps at the line end, Enter inserts a line break without sending, sending is via the explicit send button only, and line breaks are preserved when rendered.

## Impact

- **Code**: `src/components/MessageForm.tsx` (input element swap, ref type, auto-resize); `src/index.css` (textarea rule replaces the `input[type='text']` rule in `.message-form-row`; `white-space: pre-wrap` added to `.message-body`).
- **API**: none; no backend or Socket.IO changes — newlines travel as plain `body` text.
- **Dependencies**: none.
- **Config**: none.