# Changelog

**English** · [Español](CHANGELOG.es.md)

All notable changes to MD SDD Hub are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [semantic versioning](https://semver.org).

Every release must update this file, [`CHANGELOG.es.md`](CHANGELOG.es.md), [`README.md`](README.md) and [`README.es.md`](README.es.md) (see the checklist in [`AGENTS.md`](AGENTS.md)).

## [Unreleased]

### Fixed
- Copy spec and Copy task instructions respect the current phase: complete planning and move to Awaiting approval, wait for authorization before implementation, and move to Awaiting review only once all tasks and criteria are verified.
- The folder picker in “Add project” scrolls all the way to the last projects in short windows or with zoom, without clipping the list or its scrollbar.

### Changed
- **New feature flow:** `backlog` ("To do") → `planning` → `awaiting-approval` (set by the AI) → `in-progress` ("In development", the person approves) → `awaiting-review` (set by the AI) → `done` ("Finished", the person). Old `review`, `approved`, `verified` and `released` are still recognized when reading and map to the nearest new status. Each project can drop the statuses it does not use (Configure SDD tab): they disappear from its board and are saved as `skipStatuses` in `.sdd.json` so the AI skips them. Fixes and design/architecture keep their statuses. New **Delete project** button in the project header (it only removes it from the app).
- **New feature and fix statuses.** `draft` ("Borrador") is replaced by `backlog` ("Backlog", for pending work) and a closed `cancelled` status ("Cancelled") is added to features and fixes. Existing `draft`, `borrador`, `todo`, `wontfix`, `cancelled`… are still recognized when reading; documents and custom statuses that already use `draft` keep working.
- **The SDD instructions are read in parts.** Kit v5 installs them as a folder-based skill in `.skills/sdd/`: `SKILL.md` is a short index (`name`, `version`, `install`, `description` frontmatter, the rules that always apply and a table saying which file to read for each task) and each topic lives in a short file (`types.md`, `format.md`, `statuses.md`, `implementation.md`, `registry.md`, `recording-decisions.md`, `session.md`, `review.md` and `templates/`; in Spanish, `tipos.md`, `formato.md`, `estados.md`…). The AI opens only what the task needs instead of reading all the instructions every time.
- The link block is written to **`AGENTS.md`, `CLAUDE.md` and `GEMINI.md`**, creating any that are missing, so every agent finds it in its own file.
- Updating a v4 kit installs `.skills/sdd/` and removes `.sdd/instructions.md` and `.sdd/templates/` (or their Spanish equivalents). `.sdd/` is kept for the project's own files: review notices, profile, status and decisions.
- New skills are created by default in `.skills/<name>/` (for any AI) in index format; `.claude/skills/` can also be chosen.
- Kit v6. The onboarding "Design" step builds the design system instead of proposing a "Visual system" DES, and the block in `AGENTS.md`, `CLAUDE.md` and `GEMINI.md` asks the AI to ask about onboarding steps still pending, once per session.

### Added
- **Design system in parts** (`design-system.md` / `sistema-diseno.md` in the skill, with index and part templates): design decisions are written in `<design folder>/system/` (`sistema/` in Spanish), one file per part (`foundations/colors.md`, `foundations/typography.md`, `foundations/borders.md`, `components/buttons.md`, `patterns/empty-states.md`…) with an `index.md` that says where everything is. It is built up bit by bit: only what has been decided goes in, values are defined once as tokens and components cite them. Accepted DESs carry their rules into the system and `.sdd/decisions.md` links it with a single line. The AI reads the index and only the parts it touches before building screens.
- If the project already has a design and the system is not written down, the AI **asks once per session** whether to build it now; if the user says no, the "Design" step stays `Pending` and it asks again in the next session (or stops if asked to).
- The **Design** tab shows the design system: parts grouped into foundations, components and patterns, a link to the index and, if it does not exist yet, where it will be created and a button to copy the instruction asking the AI to build it from the code.
- **Copy task button**: every checkbox task (`T-NN`, `AC-NN`…) in a spec shows a ⧉ button on hover that copies it ready to paste into any AI chat (Claude, Codex, Gemini…): project, spec (ID, title and status), file, task with its description and state, a warning if the spec is not yet in progress, and a closing instruction to follow the `sdd` skill and tick the box when done.
- **Quick decisions** (`.sdd/decisions.md` / `.sdd/decisiones.md`): one rule per line, grouped by area (Copy, Interface, Code, Process), with a date and an optional link to its DES or ADR. The AI records right away the rules you set while talking to it ("say X instead of Y", "never…") and reads them before coding or writing copy. Decisions that need context still go in a DES or ADR, linked from the list.
- **Decisions** tab in each project: rules by area with search, a form to add one (the AI gets a notice) and the list of accepted DESs and ADRs.
- **Session status** (`.sdd/status.md` / `.sdd/estado.md`): the AI records where the work stands, the next steps and the blockers when it finishes each task or session, and reads it when it starts. The app shows it in the project ("Where things stand") and on its card.
- **Project profile** (`.sdd/project.md` / `.sdd/proyecto.md`) and **step-by-step onboarding** (`onboarding.md`): profile, Git, design and existing decisions. Also meant for projects already underway: the AI infers what it can from the code (stack, commands, CSS variables, Tailwind, `theme.json`, fonts, components, tone of the copy, libraries and conventions), proposes, and asks only for what is missing, one question at a time. Progress is kept in the profile's "Onboarding" table; once everything is done, it does not ask again. **SDD setup** shows the pending steps.
- **Security** (`security.md` / `seguridad.md`) and an always-apply rule: **secrets are never written** (passwords, keys, tokens, connection strings, `.env` values) in any `.md`, only the variable name; what to do if one shows up (remove it and rotate it) and which files must not be committed.
- **The app refuses to save secrets**: when editing a `.md`, adding a decision, creating a document or a skill, or changing a status with a note, if the text contains something that looks like a password, key or token, it is not saved and the line is reported. Example placeholders (`<your-key>`, `${DB_PASSWORD}`, `********`) and variable names are allowed.
- **Warning about secrets already written**: the app checks each project's `.md` files and flags (🔑) the ones containing possible secrets, with file and line, in the project, on its card and in the document list.
- **Project Git** (`.sdd/git.md`) and rules in `git.md`, which the AI **reads only when committing, pushing or deploying**: the name and email used for commits (with `git config --local`, never global), the `origin`, `dev` and `pro` remotes with their branch and when to push to each one, commit language and format. **Production (`pro`) only with explicit authorization** for each push, never `--force`; `git status` and a secrets check before every commit. **SDD setup** shows the identity and remotes.
- **Web protection**: folders with documents get an `.htaccess` (Apache 2.4 and 2.2) that blocks browser access. Hidden ones (`.sdd/`, `.skills/`, `.claude/`…) are blocked entirely and `docs/` only for Markdown files. An existing `.htaccess` is never overwritten. It is installed with the kit, checked in **SDD setup** ("Protect" button) and can be turned off in **Settings**.
- The **Skills** tab shows the skills in `.skills/` with their version and install policy (`install`).
- The `.skills/` and `.memory/` folders show up in "Documents" and ".md changes".

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
