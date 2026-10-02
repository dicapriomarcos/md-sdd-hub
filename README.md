# SDD Hub

**English** · [Español](README.es.md)

Local dashboard to track spec-driven development (SDD) across all your projects. See every spec, its status and progress, browse and edit the `.md` files AI agents write (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, docs, skills), and send your edits back to the AI for review. Zero dependencies, no database.

- **No dependencies, no database.** Node.js ≥ 18 and nothing else: no `npm install`.
- **Local only.** The server listens on `127.0.0.1:4780`; your projects never leave your machine.
- **Reads and writes your `.md` files directly.** SDD Hub's own config (added folders and settings) lives in `data/config.json`.
- **English and Spanish UI.** The browser language is detected automatically; if you pick one manually (ES/EN switch or Settings), it is remembered. Project `.md` files are never translated.

## Getting started

Double-click `iniciar.bat`, or run:

```bash
node server.js --open
```

This opens `http://localhost:4780`. To use another port, set `PORT` before starting (e.g. `set PORT=5000` on Windows).

On Windows, **Settings → Create desktop shortcut** adds an icon that starts SDD Hub in the background (`lanzar.vbs`, no console window) and opens the browser; if it is already running, it just opens the browser. To stop it: **Settings → Shut down SDD Hub**.

When you **add a folder**, the “Prepare the project for SDD Hub” option (checked by default) appends to `AGENTS.md` a link to the instructions on how specs must be written, and installs those instructions (`.claude/skills/sdd-spec`). The rest of `AGENTS.md` is left untouched.

## What it does

| View | Purpose |
|---|---|
| **Dashboard** | Active specs, in progress, SDD alerts, unread `.md` files and pending AI reviews across all your projects. |
| **.md changes** | Every Markdown file, newest first. A blue dot means it changed since you last opened it, so you can see what the AI wrote. |
| **Spec board** | Kanban by status. Dragging a card edits the `.md` (status, date, history and registry). |
| **Project → Specs** | Filterable list with status, task/criteria progress and alerts. |
| **Project → Documents** | Tree with every `.md`: `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `.codex/`, `.claude/`, `docs/`… View and edit them in place. |
| **Project → Skills** | Project skills (`.claude/skills`, `.agents`, `.gemini`, `.codex`), commands and subagents. Create new skills, copy them from another project or from `~/.claude/skills`, and install `sdd-spec`. |
| **Project → AI reviews** | Changes you made from SDD Hub that the AI has yet to review, and the AI's answer for the ones it has reviewed. |
| **Project → SDD setup** | Installs the SDD Hub kit and regenerates the specs registry. |

### SDD alerts

- Spec with no status or an unrecognized one.
- `in-progress` spec with no changes for N days (configurable).
- All checkboxes done but not moved to `verified`.
- Checkboxes done while the spec is still `draft`, `review` or `approved`.
- `verified` or `released` spec with unchecked boxes.
- Status differs from the registry (`README.md` in the specs folder).
- Dependency on a spec that does not exist.

## The SDD Hub kit (per project)

From **Project → SDD setup → Install**:

| File | Purpose |
|---|---|
| `.claude/skills/sdd-spec/SKILL.md` | Defines the exact spec format and lifecycle. Claude Code loads it automatically. |
| Block in `AGENTS.md` | Links to the skill so Codex, Gemini and other agents follow the same rules. |
| `.claude/hooks/sdd-review.js` + `.claude/settings.local.json` | `UserPromptSubmit`/`SessionStart` hook that tells Claude about your changes pending review. |
| `.sdd.json` | Manifest: specs folder, SDD document and ID prefix. |
| `docs/specs/000-TEMPLATE.md` | Canonical template. |

> The kit (skill, template and notices) is written in Spanish. The parser understands both Spanish and English keys (`Estado`/`Status`, `Actualizada`/`Updated`, `Historial`/`History`…).

### Canonical format (summary)

```markdown
# SPEC-012 · Site downtime alerts

| Campo | Valor |
|---|---|
| Estado | `in-progress` |
| Autor | … |
| Propietario | … |
| Creada | 2026-09-01 |
| Actualizada | 2026-09-12 |
| Objetivo de release | … |
| Dependencias | SPEC-007 |

## 7. Criterios de aceptación
- [ ] AC-01 · …

## 9. Plan de tareas
- [x] T-01 · …

## Historial
| Fecha | Estado | Nota |
|---|---|---|
```

Statuses: `draft` → `review` → `approved` → `in-progress` → `verified` → `released`, plus `superseded`.

Specs from **Spec Kit** (`.specify/specs/NNN-*/`), **Kiro** (`.kiro/specs/*/`) and **OpenSpec** (`openspec/changes/*/`) are also read on a best-effort basis. When they declare no status, it is inferred from the files and checkboxes.

## The AI review loop

1. You edit a `.md` from SDD Hub (text, status or checkboxes).
2. SDD Hub creates or extends `.sdd/review/<file>.md` with the diff.
3. With the hook installed, Claude Code gets the notice on your next message. Without it, ask it to “review the pending changes”.
4. The AI reviews the change (section 7 of the skill), adjusts the spec or code, writes a “Resultado de la revisión” section and moves the notice to `.sdd/review/hecho/`.
5. You see its answer in **AI reviews**.

You can turn this off in **Settings → Notify the AI of my changes**.

## Project layout

```
server.js          HTTP server and API
lib/md-parse.js    Markdown parsing: metadata, status, checkboxes, requirements, history
lib/scan.js        scanning of projects, specs, documents, skills and alerts
lib/write.js       writes: status, checkboxes, new specs, registry, kit, review notices
lib/diff.js        line diff for the notices
lib/i18n.js        server texts (errors and alerts in es/en)
public/            UI (framework-free HTML, CSS and JS; md.js is the Markdown renderer)
public/i18n.js     English UI translation (keys are the Spanish source strings)
skill/             sdd-spec skill, template and hook installed into projects
tools/             make-icon.js (builds the icon) and i18n-check.js (checks for missing translations)
lanzar.vbs         windowless launcher for the Windows shortcut
data/              local config (created at startup; git-ignored)
```

### Adding a UI language or string

UI strings are wrapped in `t('Spanish text')` in `public/app.js`, and `public/i18n.js` maps them to English. After changing UI text, run:

```bash
node tools/i18n-check.js
```

It lists any string without a translation and any unused translation.

## Security

- Listens only on `127.0.0.1` and rejects requests with any other `Host` (DNS-rebinding protection).
- Write requests require a custom header (CSRF protection).
- Only Markdown files inside the folders you added can be edited.
