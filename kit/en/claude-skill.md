---
name: sdd-spec
description: SDD documentation for this project in the MD SDD Hub format - features (specs), UX/UI design decisions, architecture decisions (ADR) and fixes. Use it whenever the user asks to create, draft, review, approve, implement, verify or close a spec, a feature, a design or architecture decision, or to document a fix ("create a spec for…", "record this decision", "create an ADR", "log this fix", "move SPEC-012 to in-progress", "check off the finished tasks"); before coding any medium or large feature; when choosing or changing technologies, patterns or code conventions, when fixing a non-trivial bug, when the user sets a rule ("say X instead of Y", "never…") and before committing, pushing or deploying.
---

<!-- sdd-hub v5 · Claude Code entry point · lang en -->

# SDD documentation (MD SDD Hub)

This project's rules are shared by every AI agent and live in the **`.skills/sdd/`** skill (at the project root). Its `SKILL.md` is an index: the rules that always apply and which file to read for each task, with the templates in `.skills/sdd/templates/`.

Before creating or changing any spec, design decision, ADR or fix, and before implementing a feature, **read `.skills/sdd/SKILL.md` and the files its index points to for that task, and follow them to the letter**. This file is only an entry point so Claude Code loads them at the right time; it contains no rules of its own.

Always answer, write and speak in English.
