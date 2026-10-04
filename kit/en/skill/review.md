# Changes made by the user from MD SDD Hub (mandatory review)

> Part of the `sdd` skill — index in [`SKILL.md`](SKILL.md).

When the user edits a `.md` from MD SDD Hub (text, status or checkboxes), the app leaves a notice with the diff in `.sdd/review/<file>.md`. If your tool has the MD SDD Hub hook installed (Claude Code), you will also get an automatic reminder at the start of each message while notices remain; otherwise, check yourself when you start.

## Procedure

When you start working on the project and whenever there are notices:

1. List `.sdd/review/*.md` (not inside `.sdd/review/done/`). If there are none, carry on as usual.
2. For each notice, read the diffs and the full file **as it is now**. Work out the intent: new or changed requirements, modified criteria, added tasks, accepted or rejected decisions, status change (`in-progress` or `accepted` mean green light; going back to `backlog`, `planning`, `awaiting-approval` or `proposed` means stop).
3. Check consistency with the rest of the document, the current code and related documents. If the change invalidates finished work, uncheck the affected `T-NN` / `AC-NN` and add the new tasks. If an ADR or DES is accepted, check whether the existing code complies and propose the necessary tasks.
4. If anything is ambiguous or contradictory, ask the user before touching code.
5. Add to the document's History: `| YYYY-MM-DD | \`current-status\` | Reviewed the user's changes: short summary |`.
6. Add a `## Review result` section at the end of the notice with what you understood, what you changed (document or code) and which questions remain open.
7. Move the notice to `.sdd/review/done/YYYY-MM-DD-HHMM-<original-name>.md`. MD SDD Hub will show your result to the user.

Do not implement code derived from a change if the spec is not `in-progress` (or the decision `accepted`): just update the document and propose the plan.
