# MD SDD Hub

**English** · [Español](README.es.md)

Local dashboard to track spec-driven development (SDD) across all your projects. See every spec, its status and progress, browse and edit the `.md` files AI agents write (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, docs, skills), and send your edits back to the AI for review. Zero dependencies, no database.

> Current version: **1.4.0** · See what changed in each release in the [CHANGELOG](CHANGELOG.md).

## Contents

- [Why](#why)
- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Starting and stopping](#starting-and-stopping)
- [First steps](#first-steps)
- [Using the app](#using-the-app)
- [The MD SDD Hub kit](#the-md-sdd-hub-kit)
- [Document types and format](#document-types-and-format)
- [The AI review loop](#the-ai-review-loop)
- [SDD alerts](#sdd-alerts)
- [Interface language](#interface-language)
- [Configuration and data](#configuration-and-data)
- [Architecture](#architecture)
- [Security and privacy](#security-and-privacy)
- [Troubleshooting](#troubleshooting)
- [Versions and changelog](#versions-and-changelog)
- [Contributing](#contributing)

## Why

When you code with AI agents (Claude Code, Codex, Gemini…), they write lots of Markdown: specs, plans, `CLAUDE.md`, `AGENTS.md`, skills, docs. Across several projects it is easy to lose track of what was written, which spec is finished, what each one requires and which changes the AI has not seen yet.

MD SDD Hub gives you one place to:

- see every spec in every project, with its status and progress;
- keep separate boards for features, design decisions, architecture decisions and fixes;
- know which `.md` files the AI created or changed since you last looked;
- read and edit any of those files directly;
- make any AI (Codex, Claude Code, Gemini, Cursor…) write documents in a single, predictable format, in your language;
- send your edits back to the AI so it reviews them.

## Features

**Overview**
- Dashboard with active features, open fixes, proposed decisions, work in progress, unread `.md` files, pending AI reviews and SDD alerts across all projects.
- Project cards with a status bar, kit status and last activity.

**Documents by type**
- Four document types per project, each with its own tab, list view and board view: **Features** (`SPEC`), **Design** (UX/UI decisions, `DES`), **Architecture** (ADR, `ADR`) and **Fixes** (`FIX`).
- Each type has its own folder, ID prefix, template and lifecycle (see [Document types and format](#document-types-and-format)).
- Automatic detection of features in `docs/specs`, `specs`, `.specify/specs` (Spec Kit), `.kiro/specs` (Kiro) and `openspec/changes` (OpenSpec), plus files with “spec” in their name inside `docs/`; of design decisions in `docs/design`; of ADRs in `docs/architecture`, `docs/adr` and `docs/decisions` (including classic adr-tools ADRs); and of fixes in `docs/fixes`.
- Status, owner, dates, dependencies and related documents, requirements (`FR-NN`), acceptance criteria (`AC-NN`), tasks (`T-NN`), severity and history extracted from each document.
- Kanban boards by status, per project or across all projects; dragging a card edits the `.md`.
- Status changes from the app update the status cell, the “updated” date, the history table and the folder registry.
- Clickable checkboxes: ticking a box edits the `.md`.
- **Copy task** (⧉ next to every checkbox): copies the task with its description, state and spec context, ready to paste into any AI chat so it keeps working on it.
- **Copy spec instruction**: adapts the message to the current status. During planning, it asks the agent to complete the document and move it to Awaiting approval; during development, it asks for implementation and Awaiting review once tasks, criteria and tests are complete. Copying a task respects the same flow.
- “New document” with a type selector: created in the type's folder with the next free ID, from the project or skill template.
- Per-type registry (`README.md` of each folder) creation and regeneration.

**Markdown files**
- “.md changes” feed: every Markdown file, newest first, with a blue dot on files changed since you last opened them.
- Per-project document tree, grouped by folder and tagged as spec, agents, skill, doc or review.
- Viewer with table of contents, rendered tables, callouts, images and internal links.
- Editor with live preview, `Ctrl+S` to save and protection against overwriting changes made on disk by the AI.
- Global full-text search across all projects (`Ctrl+K`).

**Skills**
- List of project skills (`.skills`, `.claude/skills`, `.agents/skills`, `.codex/skills`, `.gemini/skills`, `.cursor/skills`), with their version and install policy (`install`), commands and subagents.
- Global skills from `~/.claude/skills`.
- Create a skill (by default in `.skills/<name>/`, as an index with short files), copy one from another project or from the global folder.

**Working with the AI**
- Agent-neutral SDD instructions in `.skills/sdd/`, **split into parts**: a short index and one file per topic, so the AI reads only what it needs. Linked from `AGENTS.md`, `CLAUDE.md` and `GEMINI.md` (created if missing), so Codex, Claude Code, Gemini, Cursor and others write documents the same way. You are not tied to a single agent.
- **Quick decisions** in `.sdd/decisions.md`: the rules you set while talking to the AI ("say X instead of Y", "never…"), one per line and per area, with their own tab to search and add them.
- **Design system in parts** in `docs/design/system/`: the AI writes every design decision (colors, typography, spacing, borders, buttons, forms…) in its own file, with an `index.md` that says where everything is, and builds it up bit by bit. If the project already has a design, it asks once per session whether to build it now. The Design tab shows it grouped.
- **Session status** (`.sdd/status.md`): where the work stands, next steps and blockers, shown in the project. **Project profile** (`.sdd/project.md`) with onboarding the first time, so the AI does not ask again.
- **Web protection**: `.htaccess` in folders with documents so Apache (XAMPP, hosting) does not serve them.
- **No secrets in `.md` files**: the app refuses to save passwords, keys or tokens and flags (🔑) any already written; the instructions forbid the AI to write them.
- **Step-by-step onboarding** (profile, Git, design and existing decisions), also for projects already underway: the AI infers from the code and only asks you to confirm.
- **Project Git** (`.sdd/git.md`): which name and email commits use and when to push to `origin`, `dev` and `pro` (production only with your explicit authorization).
- Kit in English or Spanish (picked from the browser language): content, file names and the language the AI answers, writes and speaks in.
- One-click update for projects with an older kit.
- Review notices with diffs in `.sdd/review/` for every edit you make, plus an optional Claude Code hook that reminds the AI about them.
- “AI reviews” tab showing pending notices and the AI's answer for reviewed ones.

**App**
- English and Spanish interface, auto-detected from the browser.
- Light, dark or automatic theme.
- “Open in editor” (VS Code, Cursor, Windsurf, Zed, PhpStorm… auto-detected) and “Show in file explorer”.
- Windows desktop shortcut that starts the app with no console window.
- Automatic refresh every few seconds.

## Requirements

- [Node.js](https://nodejs.org) 18 or later. Nothing else: no `npm install`, no database.
- A modern browser (Chrome, Edge, Firefox, Safari).
- Windows, macOS or Linux. The desktop shortcut and `iniciar.bat` are Windows-only; everything else works everywhere.

## Installation

```bash
git clone https://github.com/dicapriomarcos/sdd-hub.git
```

Or download the ZIP from GitHub and unzip it anywhere. There is nothing to build or install.

To update later:

```bash
git pull
```

Your configuration (`data/`) is not tracked by git, so it survives updates.

## Starting and stopping

| How | What it does |
|---|---|
| Desktop shortcut (Windows) | Starts the server in the background (no window) and opens the browser. If it is already running, it just opens the browser. Create it from **Settings → Create desktop shortcut**. |
| `iniciar.bat` (Windows) | Starts the server in a console window and opens the browser. Closing the window stops it. |
| `node server.js --open` | Any OS. Starts the server and opens the browser. |
| `npm start` | Same as above. |

The app runs at `http://localhost:4780`. To use another port, set the `PORT` environment variable (e.g. `set PORT=5000` on Windows, `PORT=5000 node server.js` on macOS/Linux).

To stop it: **Settings → Shut down MD SDD Hub**, or close the console window if you used `iniciar.bat`.

## First steps

1. **Add a project.** Click **+ Add project**, browse to a project (or paste its path) and confirm. To add many at once, use **Scan for projects inside…** on a parent folder such as `C:\xampp\htdocs`: projects with specs, `CLAUDE.md` or `.claude` are pre-selected.
2. **Prepare the project.** The “Prepare the project for MD SDD Hub” option (checked by default) installs the SDD instructions in `.sdd/` and links them from `AGENTS.md` (and from `CLAUDE.md` / `GEMINI.md` if they exist). Pick the language next to it: it defaults to your browser language. Uncheck it if you do not want the app to write anything in that project.
3. **Install the rest of the kit (optional).** In **Project → SDD setup → Install**, add the Claude Code entry point and review hook, the template, the manifest and the registry.
4. **Work with your AI as usual** (Codex, Claude Code, Gemini…). Try: “create a spec for …”, “implement SPEC-004” or “review the pending changes”.
5. **Keep track from the app.** Check the dashboard and **.md changes** to see what the AI wrote; edit, change statuses and tick boxes, and the AI will be told.

## Using the app

### Dashboard
KPIs (active specs, in progress, unread `.md`, pending AI reviews, SDD alerts), one card per project, the latest `.md` changes, specs in progress and specs that need attention.

### .md changes
Every Markdown file in your projects, newest first. A blue dot means the file changed since you last opened it in the app. Filter by project, by category (spec, agents, skill, doc, review) or show unread only, and mark everything as read.

### Boards
One board per document type, with a column per status of that type. Pick the type at the top (Features, Design, Architecture, Fixes). Drag a card to change its status: the `.md` is edited (status, date, history and registry) and a toast lets you undo. Filter by project or text, and show or hide closed statuses.

### Project
| Tab | Content |
|---|---|
| **Features** | Application features. List (sortable, filterable: ID, title, status, progress, last change, alerts) or board view. |
| **Design** | UX/UI design decisions, as a list or a board, topped by the **design system**: its parts grouped into foundations, components and patterns, with a link to the index. If it does not exist yet, it says where it will be created and copies an instruction for the AI to build it from the code. |
| **Architecture** | Architecture decisions (ADR), as a list or a board. |
| **Fixes** | Important fixes, as a list or a board. |
| **Decisions** | The rules in force from `.sdd/decisions.md` by area, with search and a form to add one, plus the accepted DESs and ADRs. |
| **Documents** | Every `.md` in the project, grouped by folder. Create a new `.md`, filter and mark as read. |
| **Skills** | Project skills, commands and subagents, plus your global skills. Create, copy or install skills. |
| **AI reviews** | Notices pending AI review and the results of the reviewed ones. |
| **SDD setup** | Kit status in this project (instructions, links, project profile, web protection, hook…), kit installation and registry regeneration. |

If the AI has left a `.sdd/status.md`, **Where things stand** appears above the tabs: the last thing done, the next steps and the blockers. The project card on the dashboard shows its first line (or the blocker, if any).

### Document view
Header with ID, title, type and a status selector (with the statuses of that type) (asks for an optional note for the history). Side panel with progress (tasks and acceptance criteria separately, for features and fixes), details (including severity for fixes), dependencies and related documents with their status, specs that depend on this one, requirements and history. For multi-file specs (Spec Kit, Kiro, OpenSpec), each file has its own tab.

### Editor
Click **Edit** in any document. Source on the left, live preview on the right (toggle with **Preview**). `Ctrl+S` saves; `Tab` indents. If the AI changed the file on disk while you were editing, you are warned before overwriting.

### Search
Type in the top bar and press `Enter` (or `Ctrl+K` to focus it). Matching specs are shown first, then every document with its matches.

### Settings
Interface language, editor for “Open in editor”, your name for new specs, days before an in-progress spec is flagged as stale, AI notifications, web protection for documents, history rows, theme, lifecycle statuses per document type (label, color, closed or not), added projects, desktop shortcut and shutdown.

## The MD SDD Hub kit

The kit makes **any AI agent** follow the same rules: the instructions live in a neutral place in the project (`.skills/sdd/`) and the files every agent already reads (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`) link to them. You can switch between Codex, Claude Code, Gemini or Cursor on the same project.

The instructions are a **folder-based skill**: `SKILL.md` is a short index with the rules that always apply and a table saying which file to read for each task; the details live in short files the AI opens only when it needs them. Each session uses less context than reading every rule at once.

It is installed when you add a project (“Prepare the project”) or from **Project → SDD setup → Install**. Nothing is deleted; you choose which parts to install.

| File | Purpose |
|---|---|
| `.skills/sdd/SKILL.md` | Skill index (`name`, `version`, `install`, `description` frontmatter): language, the rules that always apply, what to do at the start of every session and the file table. |
| `.skills/sdd/types.md` · `format.md` · `statuses.md` · `implementation.md` · `registry.md` · `recording-decisions.md` · `design-system.md` · `onboarding.md` · `session.md` · `git.md` · `security.md` · `review.md` | One topic per file: document types, location and format, lifecycles, implementation, registry, quick decisions, design system, step-by-step onboarding, project profile and session status, Git (only when committing, pushing or deploying), security and the review procedure. In Spanish: `tipos.md`, `formato.md`, `estados.md`, `implementacion.md`, `registro.md`, `registrar-decisiones.md`, `sistema-diseno.md`, `onboarding.md`, `sesion.md`, `git.md`, `seguridad.md`, `revision.md`. |
| `.skills/sdd/templates/` (en) · `.skills/sdd/plantillas/` (es) | One template per document type (feature, design, architecture, fix) plus the profile, status, decisions, Git and design system (index and part) templates. |
| Block in `AGENTS.md`, `CLAUDE.md` and `GEMINI.md` | Links to the skill, tells the AI which language to use and what to read at the start of every session. All three are created if missing, because each agent reads its own; the block goes between `<!-- sdd-hub:start -->` markers and the rest of the file is untouched. |
| `.htaccess` in `.sdd/`, `.skills/`, `.claude/` and `docs/` | Blocks web access (Apache 2.4 and 2.2): hidden folders entirely and `docs/` only for Markdown files. An existing `.htaccess` is never overwritten. |
| `.claude/skills/sdd-spec/SKILL.md` | Optional, for Claude Code: a short skill that points to `.skills/sdd/` so Claude loads it at the right time. |
| `.claude/hooks/sdd-review.js` + `.claude/settings.local.json` | Optional, for Claude Code: `UserPromptSubmit` / `SessionStart` hook that tells Claude about your changes pending review. Local settings, not committed. |
| `.sdd.json` | Manifest: folder of each document type (`dirs`), language, SDD document and feature ID prefix. |
| `<specs>/000-TEMPLATE.md` | Canonical spec template. |
| `<specs>/README.md` | Registry with every spec and its status (only if it does not exist). |

### Onboarding

The first time an AI works on a project with the kit, it does a **step-by-step** onboarding: profile, Git, design (if there is an interface) and existing decisions. In each step it first **detects** what it can (in a project already underway, almost everything: stack and commands, remotes and commit style, CSS variables, Tailwind or `theme.json`, fonts, what buttons look like and the tone of the copy, libraries and conventions), **proposes** what it found and asks only for what is missing, one question at a time. Rules go to `.sdd/decisions.md`, the design you confirm goes to the **design system** and, if there is a technical decision with context, it proposes an ADR in `proposed` for you to accept. Progress is kept in the profile: once everything is done, the AI does not ask again. Steps you leave for later (for example, building the design system) stay `Pending` and the AI asks again once in the next session.

### Design system

Design decisions end up in a design system split into short files, in `<design folder>/system/` (`sistema/` in Spanish), so the AI reads only the part it is about to change:

```
docs/design/system/
├── index.md          index: which parts exist and where everything is
├── foundations/      colors, typography, spacing, layout, borders, shadows, icons, motion
├── components/       buttons, forms, cards, alerts, navigation, modals, tables…
└── patterns/         empty-states, loading-and-errors…
```

- **Built up bit by bit**: every time you decide something (a color, a font, the border radius, what a button looks like) the AI writes it in its part, creates the part if it does not exist and updates the index. Only what has been decided or confirmed goes in; no made-up values.
- Values are defined once in `foundations/` with a token (`--color-primary`, `--radius-md`) and components cite them; each part says where they live in the code.
- DESs still keep the why and the alternatives; once accepted, their rules move into the system. `.sdd/decisions.md` keeps a single line linking the index.
- Before building or changing a screen, the AI reads the index and only the parts it touches.
- If the project already has a design and the system is not written down, the AI asks once per session whether to build it now from the code; if you say no, it asks again in the next session, and if you ask it not to insist, it stops. To start or finish it, ask: "do the onboarding".

### Project files

`.sdd/` also holds the **project's own** files, which the app never overwrites:

| File | Who writes it | Purpose |
|---|---|---|
| `.sdd/project.md` (en) · `.sdd/proyecto.md` (es) | The AI, during onboarding | Project profile: what it is, stack, commands, structure, conventions and the "Onboarding" table with the steps done and pending. Once everything is done, the AI does not ask about the project again. |
| `.sdd/git.md` | The AI, during onboarding (Git step) | Name and email for commits, `origin` / `dev` / `pro` remotes with their branch and when to push to each one, commit language and format. Production, by default, only with explicit authorization. The AI reads it only when committing, pushing or deploying. |
| `.sdd/status.md` (en) · `.sdd/estado.md` (es) | The AI, when it finishes each task or session | Where the work stands, next steps and blockers. The AI reads it when it starts; the app shows it in the project. |
| `.sdd/decisions.md` (en) · `.sdd/decisiones.md` (es) | The AI and you (**Decisions** tab) | Rules in force, one per line and grouped by area: `- YYYY-MM-DD · Rule → DES-004`. Those that need context also have their DES or ADR. |
| `.sdd/review/` | The app | Review notices for your changes (see [The AI review loop](#the-ai-review-loop)). |

### Kit language

The kit is installed in **English** or **Spanish**. By default it follows your browser language (you can change it in the dialog). The language decides:

- the content of the instructions, templates, `AGENTS.md` block, review notices and history rows;
- the file names: `types.md` / `templates/` / `status.md` / `decisions.md` / `review/done/` in English, `tipos.md` / `plantillas/` / `estado.md` / `decisiones.md` / `review/hecho/` in Spanish, and the document slugs;
- the language the AI must **always answer, write and speak in** (chat, documents, code comments and commits). This rule is in the instructions and in the `AGENTS.md` block, which agents read at the start of every session.

Document folders (`docs/specs`, `docs/design`, `docs/architecture`, `docs/fixes`) are the same in both languages.

### Updating older kits

Projects with a kit from an older version (for example, the 1.x `.claude/skills/sdd-spec` skill) show a banner with an **Update** button. Updating keeps the kit language, installs the skill in `.skills/sdd/` and removes the previous version's single-file instructions (`.sdd/instructions.md` and `.sdd/templates/`), replaces the old `AGENTS.md` block (without duplicating it) and also writes it to `CLAUDE.md` and `GEMINI.md`, protects the folders with `.htaccess`, and turns the old Claude Code skill into the short entry point.

## Document types and format

| Type | What for | Prefix | Default folder |
|---|---|---|---|
| **Feature** | An application feature: what it does, requirements, criteria and tasks | `SPEC` | `docs/specs/` |
| **Design** | A UX/UI design decision: screens, flows, components, styles, copy, accessibility | `DES` | `docs/design/` |
| **Architecture** | A technical decision (ADR): technologies, libraries, patterns, folder and class structure, code conventions | `ADR` | `docs/architecture/` (also `docs/adr/`, `docs/decisions/`) |
| **Fix** | An important fix: symptom, root cause, solution and prevention | `FIX` | `docs/fixes/` |

One document per file: `<folder>/<PREFIX>-NNN-short-slug.md`. Folders can be changed per project in `.sdd.json` (`dirs`). In design, architecture and fix folders, only files with an ID in their name are treated as documents, so an introduction or overview file in the same folder is left alone; so are subfolders, such as the design system (`system/`).

A feature looks like this:

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
| Dependencias | SPEC-007, ADR-003 |

## 6. Requisitos
| ID | Requisito |
|---|---|
| FR-01 | … |

## 7. Criterios de aceptación
- [ ] AC-01 · …

## 9. Plan de tareas
- [x] T-01 · …

## Historial
| Fecha | Estado | Nota |
|---|---|---|
| 2026-09-12 | `in-progress` | … |
```

Design and architecture decisions have Context, Decision, Alternatives considered, Consequences and Rules (for the UI or for the code), with a `Relacionadas` row linking related documents. Fixes have Symptom, Root cause, Solution, Prevention, verification criteria (`AC-NN`), tasks (`T-NN`) and a `Gravedad` (severity) row.

### Lifecycles

**Features**

| Status | Meaning | Who decides |
|---|---|---|
| `backlog` | To do: idea or incomplete spec, not started | AI or person |
| `planning` | Being planned: requirements, criteria and tasks | AI or person |
| `awaiting-approval` | Complete, ready for the person to approve | AI |
| `in-progress` | In development (moving here is the approval) | The person (the AI only if already approved) |
| `awaiting-review` | All tasks and criteria checked, tests green | AI, with evidence |
| `done` | Finished: reviewed and accepted | The person only |
| `superseded` | Replaced by another spec | AI or person |
| `cancelled` | Dropped, will not be done | The person only |

**Design and architecture**

| Status | Meaning | Who decides |
|---|---|---|
| `proposed` | Pending decision | AI or person |
| `accepted` | In force: must be respected when coding | The person only |
| `rejected` | Discarded; kept so it is not discussed again | The person only |
| `deprecated` | No longer applies, no replacement | AI or person |
| `superseded` | Replaced by another decision | AI or person |

**Fixes**

| Status | Meaning | Who decides |
|---|---|---|
| `reported` | Documented, not investigated yet | AI or person |
| `investigating` | Looking for the root cause | AI |
| `in-progress` | Cause known, being fixed | AI |
| `verified` | Fixed, criteria checked, tests green | AI, with evidence |
| `released` | Fix deployed and checked | The person only |

Statuses can be customized per type in **Settings**. Spanish and English aliases (`draft`, `borrador`, `en curso`, `done`, `aceptada`, `fixed`…) are recognized when reading.

### Other formats

Read on a best-effort basis:

- **Spec Kit**: `.specify/specs/NNN-name/` (`spec.md`, `plan.md`, `tasks.md`…), `**Status**: Draft`.
- **Kiro**: `.kiro/specs/name/` (`requirements.md`, `design.md`, `tasks.md`).
- **OpenSpec**: `openspec/changes/name/` (`proposal.md`, `tasks.md`…); `archive/` counts as released.
- **Classic ADRs** (adr-tools): `0001-title.md` files with a `## Status` section followed by the status (`Accepted`). Status changes keep that format and new ADRs keep the plain numbering.
- **Free-form**: any `.md` with a status in YAML frontmatter (`status:`), a `| Status | … |` row or a `**Status:** …` line.

When a spec declares no status, it is inferred from its files and checkboxes and shown as “inferred”.

## The AI review loop

1. You edit a `.md` from the app (text, status or checkboxes).
2. The app creates or extends `.sdd/review/<file>.md` with what changed and the diff.
3. The `AGENTS.md` block tells every agent to check `.sdd/review/` when it starts working. With the hook installed, Claude Code also receives a reminder on your next message. Otherwise, ask your AI: “review the pending changes in .sdd/review”.
4. The AI follows `.skills/sdd/review.md`: reads the diff and the current file, checks consistency with the code and other documents, adjusts the document or tasks, writes a “Review result” section (“Resultado de la revisión” in Spanish) and moves the notice to `.sdd/review/done/` (`hecho/` in Spanish).
5. You read its answer in **Project → AI reviews**.

Disable it in **Settings → Notify the AI of my changes**.

## SDD alerts

| Alert | When |
|---|---|
| No status | The spec declares no status. |
| Unrecognized status | The status is not one of the configured ones. |
| Stale | Feature `in-progress`, or fix `investigating` / `in-progress`, with no changes for N days (14 by default). |
| Undecided | Design or architecture decision `proposed` with no changes for N days. |
| Ready to verify | Feature or fix with all checkboxes done but the status still before `verified`. |
| Started | Some checkboxes done while the feature is still `backlog`, `planning`, `awaiting-approval` or `in-progress` (or the fix `reported` / `investigating`). |
| Pending checkboxes | `verified` or `released` with unchecked boxes. |
| Registry mismatch | The status in the specs `README.md` differs from the spec. |
| Missing dependency | Depends on or relates to an ID (`SPEC-`, `DES-`, `ADR-`, `FIX-`…) that does not exist. |
| Not registered / no criteria | Informational. |
| Pending review | You changed it and the AI has not reviewed it yet. |

## Interface language

The interface is available in **English** and **Spanish**. By default it follows the browser language. Choosing one manually (ES/EN switch in the sidebar, or **Settings → Language**) is saved; pick “Automatic” to follow the browser again. Only the interface is translated: project `.md` files are never changed by the language setting.

## Configuration and data

Everything lives in the app folder; there is no database.

| File | Content |
|---|---|
| `data/config.json` | Added folders and settings. |
| `data/seen.json` | When you last opened each `.md` (used for the blue “unread” dots). |

Both are created on first start and are ignored by git. Removing a folder from the app never deletes anything from disk.

To use another data folder (for example, to test without touching your real configuration), set `SDD_HUB_DATA` before starting: `SDD_HUB_DATA=/tmp/sdd-test node server.js`.

## Architecture

Plain Node.js HTTP server with no dependencies, plus a framework-free single-page UI.

```
server.js          HTTP server and JSON API
lib/md-parse.js    Markdown parsing: metadata, status, checkboxes, requirements, history
lib/scan.js        Scanning of projects, specs, documents, skills, reviews and alerts
lib/write.js       Writes: status, checkboxes, new specs, registry, kit, review notices
lib/diff.js        Line diff for review notices
lib/secrets.js     secret detection (passwords, keys, tokens) in Markdown
lib/i18n.js        Server texts (errors and alerts in es/en; .md texts in Spanish)
public/index.html  Page shell
public/app.js      UI (routing, views, dialogs, auto-refresh)
public/i18n.js     English translation of the UI (keys are the Spanish source strings)
public/md.js       Markdown renderer (keeps line numbers so checkboxes can be edited)
public/styles.css  Styles with light/dark themes
kit/es/, kit/en/   kit installed into projects, per language: skill/ (copied to .skills/sdd/: index, topic files and templates) and the Claude Code entry point
kit/hook/          Claude Code review hook (bilingual)
tools/             make-icon.js (builds the icon), i18n-check.js (checks translations)
lanzar.vbs         Windowless launcher used by the desktop shortcut
iniciar.bat        Console launcher for Windows
```

Main API endpoints (all under `/api`, JSON):

| Endpoint | Purpose |
|---|---|
| `GET /state` | Settings and a summary of every project. |
| `GET /project?id=` | Full scan of one project (specs, documents, skills, reviews). |
| `GET /file?id=&rel=` | Content and parsed data of a `.md` (marks it as read). |
| `GET /activity`, `GET /search?q=` | `.md` change feed and full-text search. |
| `POST /file/save`, `POST /file/new` | Edit or create a `.md`. |
| `POST /spec/status`, `POST /spec/check`, `POST /spec/new` | Change status, tick a checkbox, create a document (`type`: `feature`, `design`, `architecture`, `fix`). |
| `POST /install`, `POST /registry`, `POST /protect` | Install the kit, create or regenerate a type registry (`type`), create any missing `.htaccess`. |
| `POST /decisions/add` | Add a decision to `.sdd/decisions.md` (`area`, `text`, `ref`). |
| `POST /projects/add`, `/remove`, `/update`, `POST /discover` | Manage folders and scan for projects. |
| `POST /settings`, `POST /shortcut`, `POST /shutdown` | Settings, desktop shortcut, stop the server. |

## Security and privacy

- Listens only on `127.0.0.1`; nothing is reachable from other machines.
- Rejects requests whose `Host` is not local (DNS-rebinding protection).
- Write requests require a custom header (CSRF protection).
- Only Markdown files inside folders you added can be edited; paths outside them are rejected. The only non-Markdown files the app writes are the kit files (hook, `.sdd.json`) and the `.htaccess` files.
- Project folders with documents get an `.htaccess` that blocks web access, so Apache (XAMPP, shared hosting) does not serve specs, decisions or review notices. On Nginx, block those paths in the server configuration.
- **Never secrets in `.md` files.** The app refuses to save text containing something that looks like a password, API key, token, private key or connection string with credentials, and reports the line; example placeholders (`<your-key>`, `${DB_PASSWORD}`) and variable names are allowed. It also checks the `.md` files already written (for example, by an AI) and flags them with 🔑. The kit forbids the AI to write them and tells it what to do if it finds one: remove it and say it must be rotated, because it is still in the git history.
- Production, by default, **only with explicit authorization**: the kit tells the AI not to push to `pro` without your "yes" for that specific push and never to use `--force`.
- No telemetry and no external requests: the app works offline.

## Troubleshooting

| Problem | Solution |
|---|---|
| “Port 4780 is already in use” | The app is probably already running: open `http://localhost:4780`. Or start it with another `PORT`. |
| The shortcut does nothing | Check that Node.js is installed and in `PATH` (`node -v` in a terminal). Run `iniciar.bat` to see errors. |
| “Open in editor” does nothing | Choose your editor in **Settings**, or type its command (e.g. `cursor`, `code`). |
| A spec has no status or a wrong one | Check the status cell uses one of the configured IDs in backticks, e.g. `` `in-progress` ``. |
| The AI does not review my changes | Check that the `AGENTS.md` link is installed (**SDD setup**); in Claude Code you can also install the hook. Or ask it explicitly to review `.sdd/review/`. |
| The AI answers in the wrong language | The language rule is in `.skills/sdd/SKILL.md` and in the `AGENTS.md` block. Reinstall the kit with the right language from **SDD setup**. |
| An older project shows “SDD ↑” | Its kit is from an older version: open the project and click **Update**. |
| The `.md` files can be opened from a browser | Click **Protect** in **SDD setup**. If it still returns 200, Apache is ignoring `.htaccess` files (`AllowOverride None`) or the server is Nginx: block the paths in its configuration. |
| The AI asks about the project again every session | `.sdd/project.md` is missing or its "Onboarding" table has pending steps (**SDD setup** shows them): ask it to finish the onboarding. |
| "Not saved: it looks like there is a password, key or token" | The text has something that looks like a secret on the reported line. Write only the variable name (`DB_PASSWORD` in `.env`) or a placeholder (`<your-key>`). |
| 🔑 shows up on a project | A `.md` contains a possible secret: remove it and, if it was already pushed to git, rotate that key. |
| A file in `docs/architecture` is not listed as an ADR | Only files with an ID in their name (`ADR-001-…`, `0001-…`) are treated as decisions; rename it or create it from the app. |
| A third-party plugin appears as a project | Scanning leaves folders with only `AGENTS.md` or `.git` unchecked; uncheck any others you do not want. |

## Versions and changelog

MD SDD Hub uses [semantic versioning](https://semver.org): `MAJOR.MINOR.PATCH`.

**Every release must document its new features.** For each version:

1. Bump `version` in `package.json`.
2. Add the version, date and changes to [`CHANGELOG.md`](CHANGELOG.md) and [`CHANGELOG.es.md`](CHANGELOG.es.md).
3. Update this README and [`README.es.md`](README.es.md) with every new or changed feature, and the “Current version” line at the top.
4. If the kit changes (`kit/`), bump `KIT_VERSION` in `lib/scan.js` and the version (`version:` and the `sdd-hub vN` marker) of `kit/es/skill/SKILL.md`, `kit/en/skill/SKILL.md` and both `claude-skill.md`, and keep the Spanish and English kits in sync.
5. Commit and tag the release as `vX.Y.Z`.

The same checklist is in [`AGENTS.md`](AGENTS.md), so AI agents working on this repository follow it too. The current version is shown in the app sidebar and in **Settings**.

## Contributing

- Keep it dependency-free: Node.js standard library on the server, plain HTML/CSS/JS in the browser.
- Wrap every UI string in `t('Spanish text')` and add its English translation to `public/i18n.js`. Then run:

  ```bash
  node tools/i18n-check.js
  ```

  It lists missing and unused translations.
- Strings defined in data tables (such as the document type names) are marked with `tx('…')` so the checker finds them, and translated later with `t()`.
- Server-side messages shown in the UI go in `lib/i18n.js` (Spanish and English).
- Follow the release checklist above in every pull request that adds or changes features.
