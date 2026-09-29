# Tasks

## 1. Group info modal action row

- [x] 1.1 Add `flex-wrap: wrap` to `.profile-actions` in `src/index.css`. Verify: with the group info dialog open at 390px and at 320px, no button crosses the panel border and the panel needs no horizontal scrolling, which is what the `responsive-layout` scenario "Overlays, pickers and modals fit small screens" already required and "The group info modal's action row stays inside the panel" now names explicitly.

- [x] 1.2 Confirm the rule is a no-op on desktop. Verify: with the dialog open in the 520px `wide` modal, all three buttons still sit on a single row and the dialog looks identical to before this change. The row needs roughly 438px against roughly 480px of content, so the margin is about 42px and depends on real font metrics rather than on the estimate in design.md — if it wraps, stop and report rather than committing a changed desktop layout.

## 2. Group form field spacing

- [x] 2.1 Add `className="form-field"` to the «Название» and «Описание» labels in `src/components/CreateGroupModal.tsx`. Verify: both labels carry the class and nothing else in that file does.

- [x] 2.2 Add the `.form-field` rule to `src/index.css`: `display: flex`, `flex-direction: column`, `gap: 6px`, `min-width: 0`. Verify: the 6px gap matches `.auth-card label`, and the field shows clear space between its label text and its control in both the create-group and edit-group dialogs, on a desktop viewport and at 390px.

- [x] 2.3 Confirm nothing else was pulled in. Verify: the «Ник» label in `src/components/EditProfileModal.tsx` renders exactly as before, and the member picker's contact rows in both `CreateGroupModal` and `InviteMembersModal` stay horizontal with the checkbox, avatar and name on one line. `EditProfileModal` is out of scope by design and keeps its defect.

## 3. Verification

- [x] 3.1 Run `pnpm lint` and `pnpm build`. Verify: both pass. Two pre-existing `set-state-in-effect` warnings in `ActiveCallOverlay.tsx` are expected and are not from this change.

- [ ] 3.2 Manual pass at 320/390/700/1440px in portrait and landscape: open the group info dialog from a group whose owner is the current user, and check the action row at every width, including landscape where the height budget is tightest. Then open the create-group and edit-group dialogs and check the label spacing on desktop and at 390px. Verify: the new scenario holds at every width, the pre-existing "Touch targets are large enough on phones" and "Modals with long content fit short viewports" scenarios still hold, and no regression in the member picker or the profile dialog.
