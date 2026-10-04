---
name: sdd
version: 5
install: always
description: >
  SDD documentation for this project in the MD SDD Hub format: features (specs), UX/UI design
  decisions, architecture decisions (ADR) and fixes. Use it whenever you need to create, draft, review,
  approve, implement, verify or close a spec, a feature, a design or architecture decision, or document
  a fix ("create a spec for…", "record this decision", "create an ADR", "log this fix", "move SPEC-012
  to in-progress", "check off the finished tasks"); before coding any medium or large feature; when
  choosing or changing technologies, patterns or code conventions; when fixing a non-trivial bug; and
  when there are notices in `.sdd/review/`.
---

<!-- sdd-hub v5 · format sdd-hub/1 · lang en -->

# Skill: SDD (MD SDD Hub format)

> Instructions for any AI agent (Codex, Claude Code, Gemini, Cursor, Copilot…) and for the people on the team. They are installed and updated by MD SDD Hub: if you change this folder by hand, it will be overwritten on the next update. Project-specific rules go in `AGENTS.md`.

This project follows spec-driven development. Documents are read by a tool (MD SDD Hub) that parses the files literally, so **the format is mandatory**: do not invent keys, alternative sections or other status names.

**This file is an index.** The rules below always apply; the details live in short files that are only read when the task calls for them. Do not open the whole folder.

---

## Rules that always apply

Without opening any other file:

- **Always answer, write and speak in English**: in the chat with the user, in documents (specs, decisions, fixes, history, review notices), in code comments and in commit messages. Even if someone writes to you in another language or the code is in another language, keep to English unless the user explicitly asks otherwise.
- **`.md` file names are always in English** (e.g. `SPEC-038-export-reports-to-pdf.md`).
- Technical identifiers are never translated: statuses (`backlog`, `in-progress`…), prefixes (`SPEC`, `ADR`…), `FR-NN`, `AC-NN`, `T-NN`.
- **Never** move anything to `done`, `accepted`, `rejected` or `cancelled` on your own, nor a feature from `awaiting-approval` to `in-progress`: propose it and wait for confirmation.
- Do not start coding a medium or large feature without an approved spec (in `in-progress`).
- **Before coding or writing interface copy, read `.sdd/decisions.md`** (it is short) and the `accepted` ADRs and DESs that affect what you are about to change, and follow their rules.
- When the user sets a rule ("always…", "never…", "say X instead of Y"), **record it right away** in `.sdd/decisions.md` following [`recording-decisions.md`](recording-decisions.md).
- Checkboxes (`- [ ]` / `- [x]`) are reserved for `AC-NN` and `T-NN`: the tool counts them as progress.
- **Never write secrets in any `.md`**: passwords, API keys, tokens, connection strings with credentials or `.env` values. Write only the variable name (`STRIPE_SECRET_KEY` in `.env`). If you find one, follow [`security.md`](security.md).
- **Never push to production (`pro`) without the user's explicit authorization** for that push. Before any commit or push, read [`git.md`](git.md).

## At the start of every session

1. If `.sdd/status.md` exists, read it: it says where the work stands. It is short.
2. If `.sdd/project.md` does **not** exist, or its `## Onboarding` table has `Pending` steps, follow [`onboarding.md`](onboarding.md) only for what is missing. If everything is `✅`, do not ask anything about the project.
3. Check for notices in `.sdd/review/` (not inside `done/`). If there are any, review them before continuing with related work.

When you finish a task and at the end of the session, update `.sdd/status.md` (format in [`session.md`](session.md)).

---

## Index

| File | When to read it |
|------|-----------------|
| [`types.md`](types.md) | When deciding whether something needs a document and of which type (feature, design, architecture or fix) |
| [`format.md`](format.md) | **Before creating or restructuring a document**: where it goes, its name, metadata and mandatory sections |
| [`templates/`](templates/) | When creating a document: one template per type |
| [`statuses.md`](statuses.md) | **Before changing a document's status**: lifecycles, who decides each status and the four steps of a change |
| [`implementation.md`](implementation.md) | When implementing a feature or a fix: checkboxes, new work and decisions made along the way |
| [`registry.md`](registry.md) | When creating a document or changing its status: the table in its folder's `README.md` |
| [`recording-decisions.md`](recording-decisions.md) | When the user sets a rule or a decision is made: whether it goes in a line of `.sdd/decisions.md` or in a DES / ADR, and in which format |
| [`onboarding.md`](onboarding.md) | If `.sdd/project.md` is missing or its onboarding has pending steps (profile, Git, design, existing decisions), or if the user asks to redo a step |
| [`session.md`](session.md) | When updating `.sdd/status.md` or the project profile: which project file holds what |
| [`git.md`](git.md) | **Only when committing, pushing or deploying**: identity, when to push to origin, dev and pro, and rules |
| [`security.md`](security.md) | If you find or are asked to write a secret, when touching `.env` or `.gitignore`, and when creating document folders in the public part |
| [`review.md`](review.md) | If there are notices in `.sdd/review/`: changes the user made from MD SDD Hub |
