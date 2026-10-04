# Security

> Part of the `sdd` skill — index in [`SKILL.md`](SKILL.md).

## No secrets in `.md` files

Project documents (specs, decisions, profile, status, review notices, `AGENTS.md`…) are committed to git, read by several AIs and sometimes published by accident. **Never** write in any `.md`:

- passwords, API keys, tokens, OAuth secrets, private keys or certificates;
- connection strings with a user and password (`mysql://user:secret@host`) or git URLs with credentials;
- the values from `.env`, `wp-config.php` or any configuration file with secrets;
- personal data of customers or users (emails, phone numbers, ID numbers…) that is not needed.

Instead, write **the variable name and where it lives**: "The Stripe key is in `STRIPE_SECRET_KEY` (`.env`, not committed)". For examples use obvious placeholders: `<your-key>`, `${DB_PASSWORD}`, `********`.

MD SDD Hub refuses to save a `.md` with anything that looks like a secret and flags the ones that already contain one.

## If you find one

1. Remove it from the `.md` right away and replace it with the variable name.
2. **Tell the user**: the secret has been exposed and must be **rotated** (create a new one and revoke the old one). Removing it from the file is not enough if it was already committed: it is still in the git history.
3. Do not repeat it in the chat, in the document history or in the review notice.

## Files with secrets

- `.env`, `.env.*` (except an `.env.example` without real values), keys (`*.pem`, `*.key`) and database dumps belong in `.gitignore`. If they are missing, suggest adding them.
- Never commit those files, even if the user asks without realizing: tell them first.
- Before every commit, check the diff for secrets (see [`git.md`](git.md)).

## Folders exposed on the web

If the project lives in a folder served by Apache (XAMPP, shared hosting), `.md` files can be read from a browser. MD SDD Hub adds an `.htaccess` that blocks this in `.sdd/`, `.skills/`, `.claude/` and `docs/`. If you create another folder with documents inside the public part, tell the user so it gets protected too. On Nginx, `.htaccess` files do nothing: the paths must be blocked in the server configuration.
