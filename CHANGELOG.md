# Changelog

**English** · [Español](CHANGELOG.es.md)

All notable changes to MD SDD Hub are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [semantic versioning](https://semver.org).

Every release must update this file, [`CHANGELOG.es.md`](CHANGELOG.es.md), [`README.md`](README.md) and [`README.es.md`](README.es.md) (see the checklist in [`AGENTS.md`](AGENTS.md)).

## [Unreleased]

## [1.3.0] - 2026-10-03

### Changed
- **The kit no longer depends on Claude Code.** The SDD instructions are installed in a neutral place in the project, `.sdd/instructions.md` (or `.sdd/instrucciones.md`) with templates in `.sdd/templates/` (or `.sdd/plantillas/`), so Codex, Claude Code, Gemini, Cursor and any other agent follow the same rules. You are not tied to a single agent.
- The link block is added to `AGENTS.md` (created if missing) and also to `CLAUDE.md` and `GEMINI.md` when they exist.
- The `.claude/skills/sdd-spec` skill is now optional and only a short Claude Code entry point that points to the shared instructions.
- “Prepare the project” (checked by default when adding a project) installs the instructions and the links.
- “Add folder” is now **“Add project”** throughout the interface.
- Kit v4.

### Added
- **Kit in English or Spanish**, picked from the browser language by default and selectable when adding a project or installing the kit. The language decides the content (instructions, templates, `AGENTS.md` block, review notices, history rows) and the file names (`instructions.md` / `templates/` / `review/done/` in English, `instrucciones.md` / `plantillas/` / `review/hecho/` in Spanish).
- **AI language rule**: the instructions and the `AGENTS.md` block tell the AI to always answer, write and speak in the kit language (chat, documents, code comments and commits).
- **One-click update** for projects with an older kit: an “Update” banner in the project and an “SDD ↑” badge on its card. Updating keeps the kit language, moves the instructions to `.sdd/`, replaces the old `AGENTS.md` block without duplicating it and turns the old skill into the short entry point.
- Editable file name (slug) in the “New document” dialog.
- The kit's language and version are shown in **SDD setup** and on the project card.

### Fixed
- HTML comments inside a paragraph (such as the `<!-- sdd-hub:end -->` marker) were shown as text in the document viewer.
- Request bodies with accented characters could be corrupted if they arrived split across network chunks.

## [1.2.0] - 2026-10-02

### Added
- **Document types with their own boards**: every project now has four tabs, each with a list and a board view:
  - **Features** (`SPEC-NNN`, `docs/specs/`): application features, as before.
  - **Design** (`DES-NNN`, `docs/design/`): UX/UI design decisions.
  - **Architecture** (`ADR-NNN`, `docs/architecture/`, also `docs/adr/` and `docs/decisions/`): technologies, patterns, folder and class structure, code conventions.
  - **Fixes** (`FIX-NNN`, `docs/fixes/`): important fixes with symptom, root cause, solution and prevention.
- Each type has its own lifecycle: features keep theirs; design and architecture use `proposed` → `accepted` / `rejected` → `deprecated` / `superseded`; fixes use `reported` → `investigating` → `in-progress` → `verified` → `released`.
- Templates for design decisions, ADRs and fixes in the `sdd-spec` skill.
- “New document” dialog with a type selector; each type is created in its folder with its prefix and the next free number.
- Classic ADR support (adr-tools style `0001-title.md` with a `## Status` section): read, status changes and numbering are kept.
- Global boards page with a type selector.
- Dashboard KPIs: active features, open fixes and proposed decisions.
- Per-type registries in **SDD setup** (create or regenerate the `README.md` of each folder).
- Per-type statuses in **Settings**.
- New alert: decision proposed and undecided for N days.
- `Relacionadas` / `Related` metadata (links between documents) and `Gravedad` / `Severity` for fixes.
- `SDD_HUB_DATA` environment variable to use another data folder (useful for testing).

### Changed
- `sdd-spec` skill v3: covers the four document types, when to create each one, their lifecycles, and the rule to respect `accepted` ADRs and design decisions when coding. Projects with an older version show “update available”.
- `.sdd.json` written by the kit now includes `dirs` with the folder of each type.
- The `AGENTS.md` block mentions the four types.
- Settings from 1.1 with custom statuses are migrated automatically to the Features statuses.

## [1.1.0] - 2026-10-02

### Changed
- The app is now called **MD SDD Hub** (interface, window title, console, desktop shortcut and `package.json`). Technical identifiers (`.sdd/`, `<!-- sdd-hub:start -->` markers, `sdd-hub/1` format) are unchanged, so existing projects keep working.
- `sdd-spec` skill bumped to v2 (new name in its text). Projects with v1 show “update available” in **SDD setup**.

### Added
- App version shown in the sidebar and in **Settings**, with a link to this changelog.
- Complete README in English and Spanish.
- This changelog, in English and Spanish.
- `AGENTS.md` and `CLAUDE.md` with the repository rules, including the mandatory release checklist.

## [1.0.0] - 2026-10-02

First version.

### Added
- Local Node.js server with no dependencies and no database, listening only on `127.0.0.1:4780`.
- Dashboard, “.md changes” feed with unread markers, spec board (kanban) and global search.
- Per-project tabs: Specs, Board, Documents, Skills, AI reviews and SDD setup.
- Spec detection for the canonical format, Spec Kit, Kiro, OpenSpec and free-form specs; status, requirements, acceptance criteria, tasks, dependencies and history extraction.
- Editing from the app: status changes (with history row and registry update), clickable checkboxes, editor with live preview, new specs from the template, new `.md` files, registry regeneration.
- SDD alerts: no status, unknown status, stale, ready to verify, started, pending checkboxes, registry mismatch, missing dependency.
- MD SDD Hub kit: `sdd-spec` skill, `AGENTS.md` block, Claude Code review hook, `.sdd.json` manifest, template and registry.
- “Prepare the project” option when adding a folder: installs the skill and links it from `AGENTS.md`.
- AI review loop: notices with diffs in `.sdd/review/`, reviewed results in `.sdd/review/hecho/`.
- Skills management: project, global (`~/.claude/skills`), copy between projects, create new.
- English and Spanish interface, detected from the browser and selectable manually.
- Light/dark/automatic theme, “Open in editor” and “Show in file explorer”.
- Windows desktop shortcut with a windowless launcher, and a shutdown button.
