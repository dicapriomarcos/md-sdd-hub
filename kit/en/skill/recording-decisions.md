# Quick decisions (`.sdd/decisions.md`)

> Part of the `sdd` skill — index in [`SKILL.md`](SKILL.md).

`.sdd/decisions.md` is the list of **every rule currently in force** in the project, one per line, grouped by area. It belongs to the project (MD SDD Hub does not overwrite it) and the user can also add rules from the app. Template: [templates/decisions.md](templates/decisions.md).

## When to record a decision

As soon as the user sets a rule, even in passing: "always…", "never…", "say X instead of Y", "buttons look like this", "don't use this library", "commits in English". Record it **right away**, without asking for permission, and say so in a short message: "📝 Recorded in `.sdd/decisions.md`: the rule".

Quick line or document?

- **Just a line** if the rule stands on its own and there were no alternatives to discuss (a piece of copy, a name, a preference).
- **DES or ADR** if it needs context, alternatives or consequences, or if it affects many screens or the code structure (the button system, navigation, a library). Create it as `proposed` following [`format.md`](format.md) and also add a line in `decisions.md` linking it, so every rule can be found in one place.
- **Design system** if it is a visual or component decision (a color, a font, a size, a radius, what a button or an alert looks like): write it in its part of `docs/design/system/` following [`design-system.md`](design-system.md), not as a separate line. `decisions.md` only has one line linking the system index.

## Format

```markdown
## Copy

- 2026-10-03 · Say "Save changes", not "Submit", on edit forms.

## Interface

- 2026-10-03 · Buttons: primary filled, secondary outlined, never two primaries side by side → DES-004
```

- Areas (`##` headings): `Copy`, `Interface`, `Code`, `Process`. Add another one only if none fits.
- Each rule: `- YYYY-MM-DD · Rule in the imperative, concrete and checkable`. If there is a document behind it, end with `→ ID` (`→ DES-004`, `→ ADR-002`).
- No checkboxes: checkboxes are only for `AC-NN` and `T-NN`.
- If a rule changes, **replace the line** (with the new date) instead of adding another one that contradicts it. If it no longer applies, delete it; if it had a DES or ADR, move that to `deprecated` or `superseded`.

## When to read it

It is short: read it in full **before coding, writing interface copy or proposing a decision**, and respect it just like `accepted` DESs and ADRs. If something you are asked to do contradicts it, tell the user before doing it.
