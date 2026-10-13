# Design rules

Status: being rolled out (Oct 2026); new UI work must follow it.

Goal: **elegant, simple, intuitive, modern and friendly**, in the spirit of Apple's own sites. The content
(projects, organisations, people) is the hero; the interface stays quiet.

## Principles

1. **Calm surfaces.** Light grey page, white cards, hairline borders, soft shadows only for things that
   float (menus, dialogs, the header). One accent colour (ocean blue) for actions and links.
2. **Clear hierarchy through type, not decoration.** Large confident titles, comfortable body text, few
   weights. Avoid ALL-CAPS labels except tiny eyebrows.
3. **One obvious action per screen.** Primary button filled, everything else quiet (outline/ghost/link).
4. **Generous space.** 8-pt spacing grid; let sections breathe; max content width ~1120px (text ~68ch).
5. **Friendly language.** Short, human copy: "Find projects", "Follow", "No updates yet". Every empty
   state says what it is and what to do next.
6. **Touch-first, keyboard-complete.** 44px targets, visible focus rings, works at 390px width, respects
   `prefers-reduced-motion`.
7. **Motion with purpose.** 150–250ms ease-out transitions on hover/press/open; no bouncing, no parallax.

## Tokens (defined in `src/app/globals.css`, use the Tailwind classes)

| Token | Value | Use |
|---|---|---|
| `bg-soltas-off-white` | `#F5F6F8` | page background |
| `bg-white` | `#FFFFFF` | cards, inputs, menus |
| `text-soltas-text` | `#1A2B38` | headings and body text |
| `text-soltas-muted` | `#5B6B79` | secondary text (5.5:1 on white; the old `#8A9BAB` failed contrast) |
| `text-soltas-ocean` / `bg-soltas-ocean` | `#2E6B8A` | accent: primary buttons, links, focus |
| `soltas-abyssal` | `#1A3F54` | hover/pressed accent |
| `soltas-glacial` | `#6B9FB8` | decorative only (borders, tints), never for text |
| `soltas-bark` | `#6B3F1E` | earth accent: environmental category, small highlights |
| `soltas-clay` | `#B07848` | decorative only |
| `border-soltas-line` | `rgba(26,43,56,0.08)` | hairline borders |

Map markers (`src/lib/markerColors.ts`): **humanitarian = warm orange `#E07A3F`**, **environmental = green
`#2F9E6B`**, other = ocean; white 2px ring for contrast on any map style. IATI activities = **abyssal `#1A3F54`**,
clustered (numbered circles); hollow when only the country is known. Issue urgency uses a green→red scale.
Badges: humanitarian `ocean`, environmental `green`. Always pair colour with a text label (never colour alone).

Radius: inputs/buttons `rounded-full` (pills) or `rounded-xl` for fields; cards `rounded-2xl`; dialogs
`rounded-3xl`. Shadows: `shadow-sm` for cards on hover, `shadow-lg` for floating layers only.

Type: system font stack (SF Pro on Apple devices, Segoe UI on Windows, Roboto on Android) — fast and native.

| Role | Classes |
|---|---|
| Page title | `text-3xl sm:text-4xl font-semibold tracking-tight` |
| Section title | `text-xl font-semibold tracking-tight` |
| Card title | `text-base font-semibold` |
| Body | `text-[15px] leading-6` (or `text-base` on marketing pages) |
| Secondary | `text-sm text-soltas-muted` |
| Eyebrow | `text-xs font-medium uppercase tracking-wide text-soltas-muted` (sparingly) |

## Components (`src/components/ui/`)

Use these instead of hand-rolled markup: `Button` (variants: default, secondary, outline, ghost,
destructive, link), `Card`, `Badge`, `Input`, `Textarea`, `Select`, `Checkbox`, `Switch`, `PageHeader`,
`EmptyState`, `Section`. If a pattern repeats three times, make it a component here.

## Patterns

- **Page layout:** `PageHeader` (title, one-line description, primary action on the right) → content.
- **Lists:** cards on mobile, table view optional on desktop; filters in a calm panel; a clear
  result count and an empty state with a next step.
- **Detail pages:** title + key facts at the top, primary action (Follow / Edit) beside the title,
  then sections in cards.
- **Forms:** one column, labels above fields, helper text below, errors in red next to the field,
  primary button bottom-right (full width on mobile).
- **Navigation:** translucent sticky header with a few top-level destinations; on mobile a full-screen
  menu sheet. The user menu lives top-right.
