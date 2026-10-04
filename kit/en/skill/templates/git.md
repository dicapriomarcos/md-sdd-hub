# Project Git

| Field | Value |
|---|---|
| Uses git | Yes |
| user.name | Name used for commits in this project |
| user.email | Email used for commits in this project |
| Main branch | main |
| Updated | YYYY-MM-DD |

## Remotes

URLs without credentials. "When to push" decides whether the AI may push on its own.

| Remote | URL | Branch | When to push |
|---|---|---|---|
| origin | … | main | When the user asks |
| dev | … | develop | When the user asks |
| pro | … | main | **Only with explicit authorization at that moment** |

## Commits

| Field | Value |
|---|---|
| Language | English |
| Format | TBD (e.g. `type: description` or gitmoji) |
| Who commits | The AI proposes the message and commits when the user asks |

## Notes

- What you need to know to deploy (steps after the push, caches to clear…). No passwords or keys.
