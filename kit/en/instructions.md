<!-- sdd-hub v4 · format sdd-hub/1 · lang en -->

# SDD instructions (MD SDD Hub format)

> Instructions for any AI agent (Codex, Claude Code, Gemini, Cursor, Copilot…) and for the people on the team. They are installed and updated by MD SDD Hub: if you change them by hand, they will be overwritten on the next update. Project-specific rules go in `AGENTS.md`.

This project follows spec-driven development. Documents are read by a tool (MD SDD Hub) that parses the files literally, so **the format in this document is mandatory**: do not invent keys, alternative sections or other status names.

## Language

- **Always answer, write and speak in English**: in the chat with the user, in documents (specs, decisions, fixes, history, review notices), in code comments and in commit messages. Even if someone writes to you in another language or the code is in another language, keep to English unless the user explicitly asks otherwise.
- **`.md` file names are always in English** (e.g. `SPEC-038-export-reports-to-pdf.md`).
- Technical identifiers are never translated: statuses (`draft`, `in-progress`…), prefixes (`SPEC`, `ADR`…), `FR-NN`, `AC-NN`, `T-NN`.

## 1. Document types

| Type | What for | Prefix | Default folder | Template |
|---|---|---|---|---|
| **Feature** | An application feature: what it does, requirements, criteria and tasks | `SPEC` | `docs/specs/` | [templates/feature.md](templates/feature.md) |
| **Design** | A UX/UI design decision: screens, flows, components, styles, copy, accessibility | `DES` | `docs/design/` | [templates/design.md](templates/design.md) |
| **Architecture** | A technical decision (ADR): technologies, libraries, patterns, folder and class structure, code conventions, contracts between modules | `ADR` | `docs/architecture/` | [templates/adr.md](templates/adr.md) |
| **Fix** | An important fix: symptom, root cause, solution and prevention | `FIX` | `docs/fixes/` | [templates/fix.md](templates/fix.md) |

When to create each one:

- **Feature**: new functionality or a behavior change of medium or large scope.
- **Design**: when something about the interface is decided that affects more than one screen or must be kept over time (a component pattern, navigation, the visual system, the tone of the copy).
- **Architecture**: when choosing or changing a technology or library, a pattern, the code structure or a convention. If while coding you are about to contradict an `accepted` ADR, do not do it silently: propose a new ADR that supersedes it.
- **Fix**: regressions, production incidents, bugs with a non-obvious root cause, or when the user asks. Trivial bugs do not need a FIX.

A feature can cite the decisions it relies on (`ADR-003`, `DES-002`) and a fix the affected feature (`SPEC-012`), in the `Dependencies` or `Related` row.

## 2. Where everything lives

- First read `.sdd.json` at the project root, if it exists. `dirs` gives the folder of each type (`feature`, `design`, `architecture`, `fix`), `specsDir` the features folder, `sddDoc` the system design document and `idPrefix` the feature prefix (default `SPEC`). If it does not exist, use the default folders from the table above.
- One document = one file: `<folder>/<PREFIX>-NNN-slug.md`.
  - `NNN`: next free number for that prefix, three digits (`ADR-007`). Look at the folder and use the highest + 1. Never reuse a number.
  - `slug`: **in English**, lowercase, words separated by hyphens, about 6 words max (e.g. `export-reports-to-pdf`).
- Template: `<folder>/000-TEMPLATE.md` if it exists; otherwise the one in `.sdd/templates/` for that type.
- Registry: `<folder>/README.md`, with a table under `## Registry`.

## 3. Mandatory structure

First line: `# <ID> · Title in plain language` (with the middle dot `·`).

Right after it, the template's metadata table, with its exact keys and in its order. For features:

```markdown
| Field | Value |
|---|---|
| Status | `draft` |
| Author | Who writes it (person or agent) |
| Owner | Responsible person or role |
| Created | 2026-01-31 |
| Updated | 2026-01-31 |
| Target release | Version or "TBD" |
| Dependencies | SPEC-003, ADR-002 or "None" |
```

Design and architecture use `Related` instead of `Target release` and `Dependencies`; fixes add `Severity` (High / Medium / Low).

Metadata rules:

- `Status` contains **only** the status in backticks. Nothing else in that cell: nuances ("phase 1 only", "blocked by X") go in the History.
- Dates are always ISO `YYYY-MM-DD`.
- `Dependencies` / `Related`: full IDs separated by commas, so the tool can link them.

Sections of a **feature** (numbered `##` headings; omit only those that do not apply, and say so):

1. `## 1. Summary`
2. `## 2. Problem and evidence`
3. `## 3. Goals`
4. `## 4. Out of scope`
5. `## 5. Users and permissions`
6. `## 6. Requirements`: table `| ID | Requirement |` with IDs `FR-01`, `FR-02`… (and `NFR-01` for non-functional ones).
7. `## 7. Acceptance criteria`: **only** checkboxes in this exact format:
   `- [ ] AC-01 · Verifiable description`
8. `## 8. Technical design`: architecture, data, migrations, API and UX (link the applicable ADRs and DESs).
9. `## 9. Task plan`: **only** checkboxes in this exact format:
   `- [ ] T-01 · Small, concrete task`
10. `## 10. Risks and mitigations`
11. `## 11. Open questions`

**Design and architecture**: Context, Decision, Alternatives considered, Consequences and Rules (for the interface or for the code). The rules section is the most important one: concrete rules the AI must apply from now on.

**Fix**: Symptom (with steps to reproduce), Root cause, Solution, Prevention, Verification criteria (`AC-NN`) and Task plan (`T-NN`).

Every type ends with `## History`:

```markdown
## History

| Date | Status | Note |
|---|---|---|
| 2026-01-31 | `draft` | Created |
```

Checkboxes (`- [ ]` / `- [x]`) are reserved for `AC-NN` and `T-NN`. Do not use checkboxes for other lists: the tool counts them as progress.

## 4. Lifecycles

**Features**

| Status | Meaning | Who decides |
|---|---|---|
| `draft` | Incomplete proposal, open to changes | Agent or person |
| `review` | All sections complete, ready for review | Agent or person |
| `approved` | Authorized for implementation | **The user only** |
| `in-progress` | Implementation underway | Agent, when it starts coding |
| `verified` | All `T-NN` and `AC-NN` checked and tests green | Agent, with evidence |
| `released` | Deployed and checked in production | **The user only** |
| `superseded` | Replaced by another spec or decision | Agent or person, linking the new one |

**Design and architecture**

| Status | Meaning | Who decides |
|---|---|---|
| `proposed` | Pending decision | Agent or person |
| `accepted` | In force: must be respected when coding | **The user only** |
| `rejected` | Discarded; kept so it is not discussed again | **The user only** |
| `deprecated` | No longer applies, no replacement | Agent or person |
| `superseded` | Replaced by another decision (link it) | Agent or person |

**Fixes**

| Status | Meaning | Who decides |
|---|---|---|
| `reported` | Bug documented, not investigated yet | Agent or person |
| `investigating` | Looking for the root cause | Agent |
| `in-progress` | Cause known, being fixed | Agent |
| `verified` | Fixed, criteria checked and tests green | Agent, with evidence |
| `released` | Fix deployed and checked | **The user only** |

Rules:

- Never move anything to `approved`, `accepted`, `rejected` or `released` on your own: propose it and wait for confirmation.
- Do not start coding a medium or large feature without an `approved` spec. If there is none, create it as `draft`, complete it, move it to `review` and ask for approval.
- Before coding, read the `accepted` ADRs and DESs that affect what you are about to change and follow their rules.
- To move to `verified`, every checkbox must be checked (except struck-through ones) and the relevant tests must pass. Record in the History what was run.
- If scope changes, do not delete checkboxes: strike them through (`- [ ] ~~T-04 · …~~ (dropped: reason)`) and add the new ones at the end with the next number.

## 5. When changing the status (always all four steps)

1. Change the `Status` cell.
2. Set today's date in `Updated`.
3. Add a row at the end of `## History`: `| YYYY-MM-DD | \`new-status\` | What happened and why |`.
4. Update the document's row in its folder's `README.md` (status and date).

## 6. During implementation

- Check each `T-NN` as `[x]` as soon as you finish it, not at the end.
- Check an `AC-NN` only once you have verified it (test, described manual check or screenshot).
- If you discover new work, add it as a `T-NN` before doing it.
- If you make an architecture or design decision along the way, record it as an ADR or DES in `proposed` and mention it to the user.
- At the end of the session, add a History row with the progress if the status did not change (repeat the current status).

## 7. Registry (`README.md` in each folder)

```markdown
## Registry

| ID | Title | Status | Owner | Last updated |
|---|---|---|---|---|
| [SPEC-001](SPEC-001-slug.md) | Title | `draft` | Owner | 2026-01-31 |
```

One row per document, sorted by ID. When you create a document, add its row. The registry status must always match the document's status: MD SDD Hub flags differences as alerts.

## 8. Changes made by the user from MD SDD Hub (mandatory review)

When the user edits a `.md` from MD SDD Hub (text, status or checkboxes), the app leaves a notice with the diff in `.sdd/review/<file>.md`. If your tool has the MD SDD Hub hook installed (Claude Code), you will also get an automatic reminder at the start of each message while notices remain; otherwise, check yourself when you start.

Procedure, when you start working on the project and whenever there are notices:

1. List `.sdd/review/*.md` (not inside `.sdd/review/done/`). If there are none, carry on as usual.
2. For each notice, read the diffs and the full file **as it is now**. Work out the intent: new or changed requirements, modified criteria, added tasks, accepted or rejected decisions, status change (`approved` or `accepted` mean green light; going back to `draft`, `review` or `proposed` means stop).
3. Check consistency with the rest of the document, the current code and related documents. If the change invalidates finished work, uncheck the affected `T-NN` / `AC-NN` and add the new tasks. If an ADR or DES is accepted, check whether the existing code complies and propose the necessary tasks.
4. If anything is ambiguous or contradictory, ask the user before touching code.
5. Add to the document's History: `| YYYY-MM-DD | \`current-status\` | Reviewed the user's changes: short summary |`.
6. Add a `## Review result` section at the end of the notice with what you understood, what you changed (document or code) and which questions remain open.
7. Move the notice to `.sdd/review/done/YYYY-MM-DD-HHMM-<original-name>.md`. MD SDD Hub will show your result to the user.

Do not implement code derived from a change if the spec is not `approved` or `in-progress` (or the decision `accepted`): just update the document and propose the plan.
