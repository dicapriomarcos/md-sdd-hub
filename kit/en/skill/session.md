# Project profile and session status

> Part of the `sdd` skill — index in [`SKILL.md`](SKILL.md).

Project files (not part of the kit: MD SDD Hub does not overwrite them) that keep what an AI needs to pick the work up again without asking the same things every time:

| File | What it holds | When it is read | Template |
|---|---|---|---|
| `.sdd/project.md` | The profile: what it is, stack, commands, structure, conventions and the onboarding progress. Rarely changes. | When the task needs something from it | [templates/project.md](templates/project.md) |
| `.sdd/status.md` | Where the work stands: what was being done, next steps and blockers. Changes every session. | At the start of every session | [templates/status.md](templates/status.md) |
| `.sdd/decisions.md` | The rules in force, one per line ([`recording-decisions.md`](recording-decisions.md)). | Before coding or writing copy | [templates/decisions.md](templates/decisions.md) |
| `.sdd/git.md` | Identity, remotes and when to push to each one ([`git.md`](git.md)). | Only when committing, pushing or deploying | [templates/git.md](templates/git.md) |

If `.sdd/project.md` is missing or its `## Onboarding` table has pending steps, follow [`onboarding.md`](onboarding.md).

## Keeping the profile up to date

When something in the profile changes (a command, the stack, the structure, a convention), update it right away and say so in a short message: "📝 Updated `.sdd/project.md`: what changed". Do not turn it into a long document: anything that needs explaining goes in an ADR or in `docs/`, and rules go in `.sdd/decisions.md`.

## Updating the status

Update `.sdd/status.md` **when you finish a task, when a blocker appears or is resolved, and at the end of the session**, without asking for permission and saying so in a short message ("📝 Updated `.sdd/status.md`").

- Set today's date in `Updated` and who worked in `Agent` (for example, "Claude Code" or "Codex").
- `## Where things stand`: two or three sentences on the last thing done and where it is at, with the document IDs (`SPEC-012`, `FIX-003`).
- `## Next steps`: a short, ordered list, without checkboxes (checkboxes are only for `AC-NN` and `T-NN`).
- `## Blockers`: what is preventing progress and what is needed from the user, or "None".
- Replace the content instead of piling it up: it is a snapshot, not a diary. The history is already in the documents and in git.
