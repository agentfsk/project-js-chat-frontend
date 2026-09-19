# Tasks

## 1. Composer input

- [x] 1.1 Replace the single-line `<input>` in `src/components/MessageForm.tsx` with a `<textarea rows={1}>`, retype `inputRef` to `useRef<HTMLTextAreaElement>`, and keep the existing `onChange` caret tracking; verify in the dev app that typing, caret tracking, and cursor-aware emoji insertion still work
- [x] 1.2 Implement auto-resize on change (set height to `auto`, then to `scrollHeight`, capped at 200px) and reset the height to one row after a successful send; verify the composer grows with content, scrolls internally beyond 200px, and collapses back after sending
- [x] 1.3 Verify plain Enter inserts a line break and moves the cursor to the next line WITHOUT sending, and that sending works only through the «Отправить» button with `canSubmit` behavior unchanged (disabled while empty or uploading)

## 2. Styles

- [x] 2.1 Extend the global `input { … }` rule to `input, textarea` (font, padding, border, background, focus) and replace the `.message-form-row input[type='text']` rule with a `.message-form-row textarea` rule (`flex: 1`, `resize: none`, `max-height: 200px`, `line-height`); verify the composer keeps the input's visual look at narrow window widths
- [x] 2.2 Add `white-space: pre-wrap` to `.message-body` (keeping `word-break: break-word`); verify a multi-line message renders each line on its own row in the message list

## 3. Verification

- [x] 3.1 Run `pnpm lint` and `pnpm build` and verify both pass
- [x] 3.2 With the backend running on port 5001, run two `pnpm dev` browser tabs and verify end-to-end: long text wraps at the line end, Enter inserts a newline without sending, a send via the button delivers a multi-line body that renders its line breaks in the other tab, and emoji insertion still places at the caret on a multi-line body