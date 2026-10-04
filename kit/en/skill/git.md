# Git: commits, push and deployment

> Part of the `sdd` skill — index in [`SKILL.md`](SKILL.md). **Read it only when committing, pushing or deploying.**

This project's Git configuration is in **`.sdd/git.md`**: identity, remotes, when to push to each one and how commits are written. Read it before operating. If it does not exist, do the "Git" step of [`onboarding.md`](onboarding.md).

## Rules that always apply

- **Project identity**: commit with the `user.name` and `user.email` from `.sdd/git.md`. If `git config --local user.name` / `user.email` do not match, set them with `git config --local`. **Never** touch the global configuration (`--global`).
- **`git status` before every commit**, and review the diff of what you are about to add.
- **No blind `git add .`** or `git add -A`: add the task's files by name. (Exception: the first commit of a new repository with the `.gitignore` already in place.)
- **Check the diff for secrets** before committing (keys, passwords, tokens, `.env`). If there is one, stop and follow [`security.md`](security.md).
- Never skip hooks (`--no-verify`) or commit signing.
- Messages in the format and language from `.sdd/git.md`. If a commit completes work on a spec or a fix, cite its ID (`SPEC-012`, `FIX-003`).
- If there are conflicts, show them and ask how to resolve them. Do not resolve them by discarding someone else's changes.

## When to push to each remote

The `## Remotes` table in `.sdd/git.md` decides. If it says nothing:

| Remote | Default |
|---|---|
| `origin` | Only when the user asks or `.sdd/git.md` says so. |
| `dev` (development, staging) | When the user asks. |
| `pro` (production) | **Only with the user's explicit authorization at that moment**, for that specific push. A previous authorization does not cover the next one. |

And always:

- Before pushing to `pro`, say what is about to be pushed (branch, commits) and wait for an explicit "yes".
- **Never** `git push --force` (or `--force-with-lease`) to `pro` or to the shared main branch. On other branches, only if the user asks.
- If the repository does not have the remote configured, say so before trying to push.

## Keeping `.sdd/git.md` up to date

If the user changes something (an email, a remote, a branch, when to push where), update `.sdd/git.md` right away and say so: "📝 Updated `.sdd/git.md`: what changed". Remote URLs go **without credentials** (no `https://user:token@…`).
