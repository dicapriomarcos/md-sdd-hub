# Document types

> Part of the `sdd` skill — index in [`SKILL.md`](SKILL.md).

| Type | What for | Prefix | Default folder | Template |
|---|---|---|---|---|
| **Feature** | An application feature: what it does, requirements, criteria and tasks | `SPEC` | `docs/specs/` | [templates/feature.md](templates/feature.md) |
| **Design** | A UX/UI design decision: screens, flows, components, styles, copy, accessibility | `DES` | `docs/design/` | [templates/design.md](templates/design.md) |
| **Architecture** | A technical decision (ADR): technologies, libraries, patterns, folder and class structure, code conventions, contracts between modules | `ADR` | `docs/architecture/` | [templates/adr.md](templates/adr.md) |
| **Fix** | An important fix: symptom, root cause, solution and prevention | `FIX` | `docs/fixes/` | [templates/fix.md](templates/fix.md) |

## When to create each one

- **Feature**: new functionality or a behavior change of medium or large scope.
- **Design**: when something about the interface is decided that affects more than one screen or must be kept over time (a component pattern, navigation, the visual system, the tone of the copy).
- **Architecture**: when choosing or changing a technology or library, a pattern, the code structure or a convention. If while coding you are about to contradict an `accepted` ADR, do not do it silently: propose a new ADR that supersedes it.
- **Fix**: regressions, production incidents, bugs with a non-obvious root cause, or when the user asks. Trivial bugs do not need a FIX.

A feature can cite the decisions it relies on (`ADR-003`, `DES-002`) and a fix the affected feature (`SPEC-012`), in the `Dependencies` or `Related` row.

Decisions that fit in a single line ("say X instead of Y") do not need a document: they go in `.sdd/decisions.md` (see [`recording-decisions.md`](recording-decisions.md)). The ones with a DES or ADR are also linked from there.

To create the document, follow [`format.md`](format.md).
