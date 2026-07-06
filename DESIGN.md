# Design

Visual system for Anka Sphere — captured from the live codebase. Components use inline styles with these CSS custom properties; the token layer lives in `src/styles.scss`.

## Theme

Light-first with a full dark theme (`.dark` on the root, toggled by ThemeService). Neutral cool-gray surfaces; a near-black slate sidebar anchors the shell in both themes.

## Color

Defined in `src/styles.scss` on `:root` / `.dark`:

| Token | Light | Role |
|---|---|---|
| `--color-bg` | #F9FAFB | App background |
| `--color-surface` | #FFFFFF | Cards, panels |
| `--color-surface-raised` | #F3F4F6 | Wells, table heads, hover |
| `--color-sidebar` | #1E293B | Shell sidebar (slate) |
| `--color-primary` | #3B82F6 | Primary actions, focus |
| `--color-accent` | #059669 | Success/confirm green |
| `--color-text` / `-secondary` / `-muted` | #111827 / #4B5563 / #9CA3AF | Ink ramp |
| `--color-border` / `-strong` | #E5E7EB / #D1D5DB | Hairlines |
| `--color-destructive` / `-warning` / `-info` | #DC2626 / #D97706 / #2563EB | Status (each with `-light` tint) |

**Department accents** (wayfinding, used in dept badges/tabs/links): Design `#8B5CF6` violet · Social `#EC4899` pink · Paid `#EF4444` red · SEO/Growth `#10B981` green · Reporting `#6366F1` indigo · Content `#F59E0B` amber.

## Typography

Loaded in `index.html`; applied through tokens:

- `--font-display: 'Calistoga', serif` — page titles and section headings only (friendly slab-serif counterweight to the data density)
- `--font-sans: 'Inter', system stack` — everything else; weights 300–700
- `--font-mono: 'JetBrains Mono', monospace` — code, IDs, technical values

Scale in practice: page title 22px display / section titles 14–15px semibold / body 13–13.5px / meta 11–12.5px. Body copy ≤ 75ch.

## Shape & Elevation

- Radii: `--radius-sm: 6px` · `--radius-md: 8px` · `--radius-lg: 12px`. Cards and panels use `lg`; inputs and buttons `md`; chips use their height/2 (pill).
- Shadows: `--shadow-card` (subtle resting) and `--shadow-raised` (hover/overlay). Hairline borders do most separation work; shadows stay quiet.

## Components (inline-styled per component, consistent vocabulary)

- **Shell**: dark slate sidebar with department-grouped nav; light content area with page header.
- **Cards**: white surface, 1px border, radius-lg, shadow-card; hover raises shadow only.
- **Tabs**: underline style, active = department accent color, counts as small pill badges.
- **KPI strip**: icon square (dept color) + value + label; 4-up grid.
- **Tables/lists**: grid-row layout with uppercase 11px column heads, hairline-separated rows.
- **Badges** (`ui-badge`): success/default/warning variants, tinted backgrounds.
- **Buttons**: primary = filled dept/brand color; secondary = outlined; ghost = borderless; heights 28–36px.
- **Forms**: labeled fields, 1.5px borders focused to the accent color, char counters where limits matter.
- **Status chips**: tinted background + strong-tinted text (e.g. `#FCE7F3`/`#BE185D`).

## Motion

Micro-only: 0.12–0.2s ease-out on hover/focus (background, border, shadow). Spinners for loading. All animation must respect `prefers-reduced-motion: reduce`.

## Known gaps

- `--font-*`, `--radius-*`, `--shadow-*` tokens are referenced everywhere but **were never defined** until the July 2026 polish pass — keep them defined in `styles.scss`.
- Dark-mode contrast of tinted status chips needs case-by-case checking.
