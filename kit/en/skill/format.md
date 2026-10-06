# Document location and format

> Part of the `sdd` skill — index in [`SKILL.md`](SKILL.md).

## Where everything lives

- First read `.sdd.json` at the project root, if it exists. `dirs` gives the folder of each type (`feature`, `design`, `architecture`, `fix`), `specsDir` the features folder, `sddDoc` the system design document and `idPrefix` the feature prefix (default `SPEC`). If it does not exist, use the default folders from [`types.md`](types.md).
- One document = one file: `<folder>/<PREFIX>-NNN-slug.md`.
  - `NNN`: next free number for that prefix, three digits (`ADR-007`). Look at the folder and use the highest + 1. Never reuse a number.
  - `slug`: **in English**, lowercase, words separated by hyphens, about 6 words max (e.g. `export-reports-to-pdf`).
- Template: `<folder>/000-TEMPLATE.md` if it exists; otherwise the one in [`templates/`](templates/) for that type.
- Registry: `<folder>/README.md`, with a table under `## Registry` (see [`registry.md`](registry.md)).
- The **design system** lives in `<design folder>/system/` and has its own format, with no ID or status: see [`design-system.md`](design-system.md).

## Mandatory structure

First line: `# <ID> · Title in plain language` (with the middle dot `·`).

Right after it, the template's metadata table, with its exact keys and in its order. For features:

```markdown
| Field | Value |
|---|---|
| Status | `backlog` |
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

## Sections

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
| 2026-01-31 | `backlog` | Created |
```

Checkboxes (`- [ ]` / `- [x]`) are reserved for `AC-NN` and `T-NN`. Do not use checkboxes for other lists: the tool counts them as progress.
