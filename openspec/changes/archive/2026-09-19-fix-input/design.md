# Design

## Context

See proposal.md — Why. Current state that shapes the approach:

- The composer input (`src/components/MessageForm.tsx`) is a single-line `<input type="text">`; text scrolls instead of wrapping, and Enter submits the form. `handleSubmit` runs on the form's `onSubmit`, so the only send path today is the native input behavior plus the «Отправить» button.
- The composer already tracks the caret for emoji insertion: `inputRef` (`useRef<HTMLInputElement>`), `caretRef`, and `selectionStart`/`setSelectionRange` in `handleEmojiSelect`. These APIs are identical on `<textarea>`.
- `.message-form-row input[type='text'] { flex: 1 }` (index.css) is the only input sizing rule; `.message-body` has `word-break: break-word` but no `white-space`, so line breaks collapse in the message list.
- Plain CSS with variables, no UI framework; `zustand` reserved for cross-component state (not needed here — the textarea is local to `MessageForm`).

## Goals / Non-Goals

**Goals:**
- Multi-line composer: text wraps at the line end, Enter inserts a line break and moves the cursor down.
- Composer grows with its content like a real messenger, collapses back to one row after a send.
- Sending only through the «Отправить» button; `canSubmit` logic untouched.
- Multi-line bodies keep their line breaks in the rendered list.
- Zero backend/Socket.IO changes; newlines are plain text in `body`.

**Non-Goals:**
- Keyboard send shortcut (Ctrl/Cmd+Enter) — explicitly declined in favor of button-only sending.
- Rich text, markdown, or draft persistence — plain text only.
- Changing the trim behavior of the sent body.

## Decisions

### 1. Native `<textarea>` instead of an `<input>` with Enter interception

Replace the `<input>` with `<textarea rows={1}>` and retype `inputRef` to `useRef<HTMLTextAreaElement>`. The textarea natively does both required behaviors: text wraps at the right edge, and Enter inserts a line break without submitting the form (only `<input>` commits on Enter). No `onKeyDown` interception is needed at all — the browser already gives Enter-as-newline. `handleEmojiSelect`'s `selectionStart`/`setSelectionRange` caret restore works unchanged; `caretRef` tracking in the existing `onChange` is untouched.

Alternatives:
- Intercept Enter and `preventDefault()` + splice a `\n` — rejected as redundant: the textarea does this natively, so a handler would only add surface for bugs.
- Fixed-height `<textarea>` with internal scroll — rejected: a growing composer matches the messenger feel better and keeps multi-line drafts scannable while typing.

### 2. Auto-resize via `scrollHeight`, capped, reset on send

On every change, set `style.height` to `auto`, then to `scrollHeight`, capped at ~200px (beyond that the textarea scrolls internally). After a successful send, reset height to `auto` so the empty composer returns to one row. This is a two-state measure on a `useRef` (the same `inputRef`), driven by the existing `setBody` state — no reflow loop because the height is derived from the value at render.

Alternative: CSS `field-sizing: content` — not used, browser support is not yet universal enough for a ship target.

### 3. Send path unchanged: form submit via the button only

The form's `onSubmit` → `handleSubmit` stays exactly as-is; the textarea cannot submit on Enter, so the button becomes the sole send trigger, matching the confirmed UX decision. `canSubmit` (`!uploading && (body.trim().length > 0 || file !== null)`) is unchanged.

### 4. CSS: retarget the input rule to the textarea

Replace `.message-form-row input[type='text'] { flex: 1 }` with a `.message-form-row textarea` rule: `flex: 1`, `resize: none`, `max-height: 200px` (mirroring the JS cap), padding and line-height to match the input's previous visual. There is a global `input { … }` rule (font, padding, border, background, focus border-color) but no corresponding `textarea` rule anywhere, so the scoped textarea rule must supply those same visuals — the simplest form is extending the global selectors to `input, textarea` and adding only the layout rule in `.message-form-row`.

### 5. Preserve line breaks in rendered messages

Add `white-space: pre-wrap` to `.message-body` (keeping `word-break: break-word`). This is not implied by the send path — the current CSS collapses the newlines, so without this the multi-line feature would break in the message list.

## Risks / Trade-offs

- **Leading/trailing blank lines are trimmed on send** (`body.trim()` in `handleSubmit`) → Accepted: pre-existing behavior; interior line breaks are preserved.
- **Long pasted content grows the composer** → capped at 200px, then the textarea scrolls internally; matches Telegram behavior.
- **Caret restore after an emoji pick on a wrapped line** → caret indices are offsets into the string value, independent of visual wrapping; the existing restore logic is valid on the textarea.
- **Vertical layout shift as the composer grows** → the fixed cap bounds the shift; `scrollIntoView` on new messages is scoped to the list and unaffected.

## Migration Plan

Additive, frontend-only, no deployment steps: `pnpm lint` and `pnpm build` gate the change; rollback is reverting the commit — the input returns to single-line behavior and message history is unaffected (already-sent multi-line bodies simply collapse again).

## Open Questions

None.