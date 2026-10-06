# Project onboarding

> Part of the `sdd` skill — index in [`SKILL.md`](SKILL.md).

Onboarding gathers what an AI needs to know about a project so it does not ask again every session. It works the same for a new project and for one **already underway**: in that case almost everything can be inferred from the code, and the user only confirms.

It is done **in steps** and the progress is kept in the `## Onboarding` table of `.sdd/project.md`:

```markdown
## Onboarding

| Step | Status |
|---|---|
| Profile | ✅ |
| Git | ✅ |
| Design | Pending |
| Existing decisions | N/A |
```

Statuses: `✅`, `Pending` or `N/A` (for example, Design in a library with no interface).

## When

- **If `.sdd/project.md` does not exist** or its table has `Pending` steps: do **only the pending steps**, before the first medium or large task. If the user asks for something small and urgent, do that first and suggest the onboarding afterwards.
- **If every step is `✅` or `N/A`: do nothing.** Do not read this file again or ask about the project.
- If the user asks "do the design onboarding" (or another step), do it even if it is checked.

## How, in each step

1. **Detect before asking.** Read whatever the step says (below) without asking for permission.
2. Say it once: "Before we start I need to get to know this project a little. I'll ask you a few short questions."
3. **Ask one question at a time**, and only what you could not infer. In each question suggest the answer you inferred so the user only has to confirm or correct it. Five questions per step at most.
4. Write the result where it belongs and mark the step `✅` in the table. If the user prefers to leave it for later, keep it `Pending`.
5. Never copy values from `.env`, passwords or keys (see [`security.md`](security.md)): only the variable names.

## Step 1 · Profile

- **Detect**: `README`, `package.json`, `composer.json`, `pyproject.toml`, `Gemfile`, `go.mod`, the folder structure, the test and lint configuration, `AGENTS.md`.
- **Ask** what is missing: what the project is and who it is for, how it is started and tested, where it is deployed.
- **Write** `.sdd/project.md` from the [template](templates/project.md) (whatever is unknown, "TBD") and create `.sdd/status.md` and `.sdd/decisions.md` from their templates if they do not exist.

## Step 2 · Git

- **Detect**: whether there is a repository, `git remote -v` (without copying credentials from the URLs), the current branch and the remote branches, `git config --local user.name` / `user.email` and the style of the latest commits (`git log --oneline -15`: language, prefixes, emojis).
- **Ask** what is missing: which name and email commits use in this project, which remotes exist (origin, dev, pro…) and when to push to each, and whether the AI commits on its own or only proposes the commit.
- **Write** `.sdd/git.md` from the [template](templates/git.md). By default, `pro` (production) **only with explicit authorization**.

## Step 3 · Design (if the project has an interface)

In a project already underway the design exists even if it is not written down: the goal is to write it down, as a **design system** in parts, so the AI respects it. When to propose it and what to do if the user leaves it for later (you ask again in the next session): [`design-system.md`](design-system.md). If there is no design yet, leave the step `Pending` until one arrives.

- **Detect**: CSS variables (`:root`, `--color-*`), `tailwind.config.*`, `theme.json` (WordPress), tokens or the theme of the component framework, the fonts being loaded, and what the most repeated components actually look like (buttons, forms, cards, alerts). Also look at the tone of the interface copy (formal or informal, capitalization, length).
- **Propose**, do not impose: summarize what you found ("Primary #2563eb, Inter font, 8 px rounded buttons with sentence-case labels, informal tone") and ask whether that is how it should stay or whether something is a mistake that must not be copied.
- **Write**:
  - What was confirmed, in the **design system** (`docs/design/system/`) following [`design-system.md`](design-system.md): `index.md` and one part for each thing you found (`foundations/colors.md`, `foundations/typography.md`, `foundations/borders.md`, `components/buttons.md`…), with their tokens and where they live in the code. Only the parts there is something for; the rest will be added as it is decided.
  - In `.sdd/decisions.md`, the `Interface` line linking the system index and the `Copy` rules (tone, formal or informal), as [`recording-decisions.md`](recording-decisions.md) explains.
  - Whatever the user is unsure about or wants to change, under "To be defined" in the index or as a DES in `proposed`.

## Step 4 · Existing decisions

- **Detect**: the technical decisions already made in the code: framework and version, state management, ORM, folder structure, naming conventions, libraries in use (and the ones avoided), how tests are written.
- **Propose** the list to the user and ask which ones are firm decisions and which are accidents.
- **Write** the firm ones as rules in `.sdd/decisions.md` (`Code` area) and, those that need context, as ADRs in `proposed`. Do not create an ADR for every library: only for what would be argued about again if nobody wrote it down.
