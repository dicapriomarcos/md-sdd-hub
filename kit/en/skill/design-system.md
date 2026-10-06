# Design system

> Part of the `sdd` skill — index in [`SKILL.md`](SKILL.md).

The design system gathers **what is currently in force** in the interface: colors, typography, spacing, borders, shadows, icons, components and patterns. It is split into many short files with an index, so the AI reads only the part it is about to change, and **it is built up bit by bit**: every design decision that is made ends up written in its part.

## Where it lives

In the `system/` subfolder of the design folder (`dirs.design` in `.sdd.json`; by default `docs/design/system/`). The index is `system/index.md`. Reference structure (create only what is needed):

```
docs/design/system/
├── index.md              ← index: which parts exist and where everything is
├── foundations/
│   ├── colors.md         palette, brand colors, semantic colors (success, error…), dark mode
│   ├── typography.md     fonts, type scale, weights, line height
│   ├── spacing.md        spacing scale (4, 8, 16…)
│   ├── layout.md         grid, max widths, breakpoints
│   ├── borders.md        radii (border-radius) and border widths
│   ├── shadows.md        elevation
│   ├── icons.md          library, sizes, stroke
│   └── motion.md         durations, easing, when to animate
├── components/
│   ├── buttons.md
│   ├── forms.md
│   ├── cards.md
│   ├── alerts.md
│   ├── navigation.md
│   ├── modals.md
│   └── tables.md
└── patterns/
    ├── empty-states.md
    └── loading-and-errors.md
```

File names are in English, lowercase, with words separated by hyphens. If you need a part that is not on the list (`components/tabs.md`, `foundations/illustrations.md`), create it in the folder it belongs to. These files have no ID or status: they are not decisions, they are the result of them.

## When to propose it

The `Design` step of the `## Onboarding` table in `.sdd/project.md` says whether the system has been built.

- **If there is already a design** (styles in the code, a theme, mockups, Figma, screenshots or a design the user gives you) and the `Design` step is `Pending`, or it is `✅` but `system/index.md` does not exist (it was done with an earlier kit), **ask once**: "This project already has a design, but it is not written down as a design system. Shall I build it now from what is there? I will only ask you to confirm what I find".
- **If they say yes**: follow step 3 of [`onboarding.md`](onboarding.md) (detect, propose, write) and set `Design` to `✅`.
- **If they say no or later**: leave `Design` as `Pending`, add it to `## Next steps` in `.sdd/status.md` and **do not ask again in this session**. Ask again at the start of the next one, when interface work comes up. Meanwhile, single decisions the user makes are still written in their part.
- **If they ask you never to ask again**: set `Design` to `N/A` and do not insist; the system will keep growing with the decisions that are made.
- **If there is no design yet** (new project): leave `Design` as `Pending` and ask the first time one arrives (the user gives a palette, a mockup or a Figma file, or the first screens are built).

## How it is built

- **When a design decision is made, write it in its part right away**: a color, a font, a radius, what a button looks like, what an alert does. If the part does not exist, create it with the [template](templates/design-system-part.md); if the system does not exist, also create `index.md` with the [index template](templates/design-system-index.md). Say so in a short message: "🎨 Updated `docs/design/system/components/buttons.md`: radius `--radius-md`".
- **Only what has been decided goes in**: what the user says, what they confirm during onboarding or what an `accepted` DES says. What you propose and nobody has confirmed does not go in: ask, or create a DES as `proposed`. Do not fill parts with made-up values or create empty files "just in case".
- **One thing, one place.** Values are defined once, in `foundations/`, with a token name (`--color-primary`, `--radius-md`, `--space-4`). Components and patterns cite the token, never the raw value, so changing it means touching a single line.
- **The code rules the values.** If the tokens exist in the code (CSS variables in `:root`, `tailwind.config.*`, `theme.json`, the framework theme), each part says under "In the code" where they live, and when a value changes it changes in both places. If you see that the code and the system disagree, tell the user instead of choosing yourself.
- **When something changes, replace it**: the system is a snapshot of what is in force, not a history. Put today's date in the part's `Updated` and in its row of the index. The why and the alternatives go in the DES (link it under "Decisions"); the history, in git.
- **Keep the index up to date**: every part that is created, split or deleted changes its row in `index.md`. If a part grows past about 150 lines, split it (for example `components/forms/fields.md` and `components/forms/selects.md`) and update the index.
- No checkboxes (`- [ ]`): they are only for `AC-NN` and `T-NN`.

## With DESs and `.sdd/decisions.md`

- **DES**: for decisions that need context or alternatives (the button system, navigation, dark mode). While it is `proposed`, the system does not change. When the user moves it to `accepted`, carry its rules into the parts it affects and link the DES in their "Decisions" section.
- **`.sdd/decisions.md`**: when you create the system, add a single line under `Interface` linking it: `- YYYY-MM-DD · Follow the design system: read docs/design/system/index.md and the parts you touch`. Visual and component rules go in the system, not as separate lines in `decisions.md`, so they do not live in two places. Copy rules (`Copy`) stay in `decisions.md`.

## When to read it

**Before building or changing a screen or a component**: read `index.md` and **only the parts you are going to touch** (a button: `components/buttons.md` and the tokens it cites). Do not open the whole folder. Use the system's tokens instead of raw values and, if what you are asked contradicts it, say so before doing it.
