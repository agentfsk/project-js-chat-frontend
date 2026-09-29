# Design

## Context

Two independent CSS defects in the group management modals. Neither needs a
component change to fix, but one of them needs a class added to markup, and the
scope decision for that class is the only genuinely open question in this change.

Current relevant CSS:

```css
.profile-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;      /* the fix, already present on the sibling row */
}
```

## Decision 1: reflow the action row by width, not by breakpoint

`.profile-actions` gains `flex-wrap: wrap`. `gap: 8px` is a shorthand that sets
row-gap and column-gap alike, so the wrapped rows separate by 8px as well without
a second declaration.

Alternatives considered:

- **A media query below 700px that stacks the buttons full-width.** More CSS, and
  it changes the dialog's visual weight on phones rather than letting the buttons
  stay their natural size. It also duplicates the breakpoint in a second place for
  a defect that is not about phones.
- **Shrinking the font or the horizontal padding on narrow screens.** Rejected: the
  `responsive-layout` scenario "Touch targets are large enough on phones" sets a
  40px floor, and shrinking to make things fit fights a requirement that exists
  precisely so the fit is achieved by reflowing.
- **Horizontal scrolling on the row.** Rejected outright: "without horizontal
  scrolling" is the very clause of the existing scenario being repaired.

**Why width-driven rather than breakpoint-driven.** The `wide` modal is capped at
520px but the panel is also narrow on a small desktop window, and the group info
dialog is reachable there too. A breakpoint would leave that case broken while
appearing to fix the phone case. `flex-wrap` is correct at every width: it is a
no-op when the content fits and a reflow when it does not.

**No visual change on desktop, and that has to be confirmed.** At the 520px cap
the content box is about 480px. The three buttons need roughly 438px, estimated
from `padding: 8px 14px` on a ~15px inherited font. The margin is about 42px, so
the estimate is load-bearing: if the real metrics put the row over 480px, the row
wraps on desktop too and the dialog gains a second row of buttons. The estimate is
arithmetic, not observation. It gets checked in a browser before commit, and if it
wraps on desktop the alternative is not to add `flex-wrap` but to give the row a
`max-width` or let the buttons shrink. Nothing in the spec forces the row to stay
on one line at desktop widths — the new scenario is scoped to viewports narrower
than 700px — so this is a judgement about not changing a correct layout, not a
compliance requirement.

## Decision 2: give the group form its own class instead of a shared rule

The defect is that «Название» and «Описание» have no layout rule at all. Three
fixes were on the table.

**Rejected: `.modal form > label { display: flex; flex-direction: column; gap: 6px; min-width: 0 }`.**
The child combinator is what makes this correct rather than dangerous — the three
field labels are direct children of the `<form>`, while the member picker's
checkbox labels sit three levels down through `div.member-picker > ul > li`. Without
`>` the rule scores `(0,1,2)` and would override `.member-picker-item label`
`(0,1,1)`, flipping the checkbox rows from horizontal to vertical. With `>`, the
member picker is untouched because it is never selected.

This variant was dropped on scope, not on correctness. It would also repair
`EditProfileModal`'s «Ник» label, which has the identical defect. That repair is
wanted but belongs to a different dialog and is not part of this change, so the
group form gets an explicit class instead of a rule that silently reaches two
modals. A shared rule would also make the `EditProfileModal` fix look already-done
to the next reader, when it is not.

**Chosen: a `.form-field` class on the two labels.** The class name does not exist
in the codebase, so there is no collision to reason about. It is unscoped by a
parent, which is a deliberate trade: the class describes a field's own internal
layout and stays correct wherever it is applied, at the cost of a future
`.form-field` elsewhere inheriting it. Scoping it to `.modal form > .form-field`
would remove that cost and lose nothing, since the class is only used in modals;
this is left as written because the shorter form is what the class is for.

`min-width: 0` is carried over from `.modal` itself, where it prevents a flex item
from refusing to shrink below its content width. The textarea is the widest
element the form holds, so without it a long description could resist shrinking in
the same way the action row resisted it.

## Decision 3: 6px, from the file's own value

The gap is 6px because `.auth-card label` already uses `gap: 6px` for the same
relationship between a field label and its control. The login page is the only
place in the app where this pairing currently has breathing room, and matching it
makes the two look like the same form rather than two different conventions.

## Risks

| Risk | Mitigation |
|---|---|
| The desktop action row wraps and changes a correct layout | The 42px margin is an estimate; verified in a browser before commit. The new scenario is scoped to viewports narrower than 700px, so wrapping on desktop is not a spec violation, only an unwanted visual change |
| A later `.form-field` elsewhere inherits the rule | Accepted. The rule is a field's own layout and is location-independent |
| `flex-wrap` is mistaken for a phone-only concern | Avoided by Decision 1: the rule is width-driven, and the design records why a breakpoint would be wrong |

## Migration

None. No stored data, no protocol change, no capability other than
`responsive-layout` changes behaviour for anyone. The two defects are visible on
the first render after deployment.

## Open Questions

None. The one decision that needed judgement — whether to repair
`EditProfileModal` in passing — was answered: not in this change.
