# Why

Two layout defects in the group management modals, both reachable from the
group info dialog on a phone.

**The group info modal's action row overflows the panel.** «Пригласить друзей»,
«Изменить группу» and «Удалить группу» sit in a non-wrapping flex row. The modal
has no `overflow`, so once the three buttons need more width than the panel
offers they are drawn past the panel border. At 390px the row needs roughly 438px
against roughly 302px of content width. The sibling `.modal-actions` row already
carries `flex-wrap: wrap`; `.profile-actions` is the same shape without it.

This breaks an existing guarantee rather than revealing a new one: the
`responsive-layout` scenario "Overlays, pickers and modals fit small screens"
already requires a panel to fit fully within the viewport with no clipped content.
The group info modal does not honour it today.

**The group form's fields are flush against their labels.** In
`CreateGroupModal` the «Название» and «Описание» labels have no layout rule, so
the label keeps its default `display: inline` and the text node and the
`inline-block` input flow together. The input cannot fit the remainder of the
line, wraps to the next line, and touches the text with no space between them.
The project has a `label { gap: 6px }` rule but it is scoped to `.auth-card`, so
the login page is the only place a field label has breathing room.

## What Changes

- `.profile-actions` wraps, so the group info action row reflows onto further rows
  instead of crossing the panel border.
- The «Название» and «Описание» fields in the group create/edit form are laid out
  as a vertical stack with a gap between the label text and the control.

## Capabilities

- Modified: `responsive-layout` — the group info modal's action row now reflows to
  stay inside the panel, made explicit as a scenario so the regression is guarded.
- `profiles` is not touched: see Scope.

## Impact

- Affected specs: `responsive-layout`
- Affected code:
  - `src/index.css` — `.profile-actions`, plus a new `.form-field` rule
  - `src/components/CreateGroupModal.tsx` — the «Название» and «Описание» labels
- No backend, protocol, storage or schema change. The change is CSS plus two class
  attributes.
- Not affected: the group create/edit form's validation, avatar upload or member
  picker. The member picker's checkbox rows keep their horizontal layout.

## Scope

`EditProfileModal` has the identical label defect — `Ник` at
`src/components/EditProfileModal.tsx:92` is the same unstyled `label` wrapping an
`input`, so it renders flush against the text the same way. A shared rule such as
`.modal form > label` would have repaired it in passing. That repair is
deliberately left out of this change, so the group form gets its own class and the
profile dialog is addressed separately.

`EditProfileModal` is not part of any capability in `openspec/specs/`, so it could
not be given a spec-level scenario here regardless.

## Risks

- **`flex-wrap` reflowing the desktop row.** The rule is width-driven, not
  breakpoint-driven, so it also applies to a narrow desktop window and to the
  520px `wide` modal. At that width the three buttons are expected to still fit on
  one row and the rule to be a no-op, but that depends on the rendered font
  metrics rather than on anything asserted here. If the row wraps on desktop the
  dialog gains a second row of buttons, which is a visible change to an otherwise
  correct layout. To be confirmed in a browser before this change is committed.
- **Cascade of the new `.form-field` class.** The name does not exist in the
  codebase today, so it cannot collide with an existing rule. It is also not
  scoped to a parent, which means a later `.form-field` elsewhere in the app would
  inherit it. Accepted: the class describes a field's own layout and is
  unambiguous.
