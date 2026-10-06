# Lifecycles and status changes

> Part of the `sdd` skill — index in [`SKILL.md`](SKILL.md).

## Features

| Status | Meaning | Who decides |
|---|---|---|
| `backlog` | To do: idea or incomplete spec, not started | Agent or person |
| `planning` | Being planned: requirements, criteria and tasks are being written | Agent or person |
| `awaiting-approval` | All sections complete, ready for the person to approve | Agent |
| `in-progress` | In development. Moving here from `awaiting-approval` is the approval | **The user only** (the agent only if it was already approved) |
| `awaiting-review` | Every `T-NN` and `AC-NN` checked and tests green | Agent, with evidence |
| `done` | Finished: reviewed and accepted | **The user only** |
| `superseded` | Replaced by another spec or decision | Agent or person, linking the new one |
| `cancelled` | Dropped, will not be done; kept for the record | **The user only** |

## Design and architecture

| Status | Meaning | Who decides |
|---|---|---|
| `proposed` | Pending decision | Agent or person |
| `accepted` | In force: must be respected when coding | **The user only** |
| `rejected` | Discarded; kept so it is not discussed again | **The user only** |
| `deprecated` | No longer applies, no replacement | Agent or person |
| `superseded` | Replaced by another decision (link it) | Agent or person |

## Fixes

| Status | Meaning | Who decides |
|---|---|---|
| `reported` | Bug documented, not investigated yet | Agent or person |
| `investigating` | Looking for the root cause | Agent |
| `in-progress` | Cause known, being fixed | Agent |
| `verified` | Fixed, criteria checked and tests green | Agent, with evidence |
| `released` | Fix deployed and checked | **The user only** |
| `cancelled` | Dropped or not a bug (won't fix); kept for the record | **The user only** |

## Rules

- Never move anything to `done`, `accepted`, `rejected` or `cancelled` on your own, nor a feature from `awaiting-approval` to `in-progress`: propose it and wait for confirmation.
- Feature flow: `backlog` → `planning` → `awaiting-approval` (you set it when the spec is finished) → `in-progress` (the person approves) → `awaiting-review` (you set it when finished, with evidence) → `done` (the person).
- Do not start coding a medium or large feature without a spec in `in-progress` approved by the person. If there is none, create it as `backlog`, complete it, move it to `awaiting-approval` and ask for approval.
- A project may skip statuses it does not use (for example `planning` or `awaiting-review`). If `.sdd.json` has `skipStatuses`, do not use those: go to the next one in the flow.
- To move to `awaiting-review` (or `verified` for fixes), every checkbox must be checked (except struck-through ones) and the relevant tests must pass. Record in the History what was run.
- If scope changes, do not delete checkboxes: strike them through (`- [ ] ~~T-04 · …~~ (dropped: reason)`) and add the new ones at the end with the next number.

## When changing the status (always all four steps)

1. Change the `Status` cell.
2. Set today's date in `Updated`.
3. Add a row at the end of `## History`: `| YYYY-MM-DD | \`new-status\` | What happened and why |`.
4. Update the document's row in its folder's `README.md` (status and date), as [`registry.md`](registry.md) explains.

When a DES or ADR becomes `accepted`, add its main rule to `.sdd/decisions.md` with `→ ID`; if it becomes `deprecated` or `superseded`, remove or replace that line. If it is a DES that sets something visual or about components, also carry its rules and values into the design system parts it affects ([`design-system.md`](design-system.md)).
