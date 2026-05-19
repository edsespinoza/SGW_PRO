# SGW Pro — Design Tokens

## Theme

Dark mode nativo. Background `#030712` (sgw-950), superfície `#080f1e` (sgw-900). Design orientado a dados para uso em ambientes com pouca luz (oficinas).

## Color Palette

### Base (oklch)
- `sgw-950`: `oklch(0.02 0.01 260)` — fundo principal
- `sgw-900`: `oklch(0.04 0.015 260)` — superfície elevada
- `sgw-850`: `oklch(0.055 0.02 260)` — cartões
- `sgw-800`: `oklch(0.12 0.025 260)` — bordas / inputs
- `sgw-750`: `oklch(0.15 0.03 260)` — hover states
- `sgw-700`: `oklch(0.18 0.035 260)` — bordas fortes
- `sgw-600`: `oklch(0.25 0.045 260)` — accent secundário
- `sgw-500`: `oklch(0.32 0.055 260)` — accent terciário

### Cyan (primary)
- `cy-400`: `oklch(0.78 0.12 200)` — `#22d3ee`
- `cy-500`: `oklch(0.70 0.16 200)` — `#06b6d4`
- `cy-600`: `oklch(0.60 0.18 200)` — `#0891b2`

### Violet (secondary)
- `vi-400`: `oklch(0.72 0.15 300)` — `#a78bfa`
- `vi-500`: `oklch(0.65 0.20 300)` — `#8b5cf6`

### Status
- Active: `oklch(0.72 0.15 150)` — `#34d399`
- Pending: `oklch(0.78 0.12 90)` — `#fbbf24`
- Expired: `oklch(0.68 0.15 30)` — `#f87171`
- Revoked: `oklch(0.55 0.02 260)` — `#94a3b8`

## Typography

### Font Families
- Display/Headings: `'Bebas Neue', sans-serif` / `'Chivo', sans-serif`
- Body: `'Inter', system-ui, sans-serif`
- Mono: `'JetBrains Mono', monospace`

### Scale
- Body: `0.875rem` (14px)
- Small: `0.75rem` (12px)
- Heading: `1.25rem`–`2rem`
- Display: `2.5rem`–`3.5rem`

## Spacing

Base unit: 4px. Multiplicadores: 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20.

- Card padding: `1.25rem` (20px)
- Section gap: `1.5rem` (24px)
- Grid gap: `0.75rem`–`1rem`
- Nav padding: `0.6rem 0.9rem`

## Components

### Glass Card
```css
.glass-card{background:rgba(13,21,38,.75);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.07);border-radius:1rem;}
```

### Input
```css
.fi{background:rgba(8,15,30,.8);border:1px solid rgba(255,255,255,.1);border-radius:.75rem;padding:.65rem 1rem;}
```

### Button Variants
- `primary`: gradient cyan `#06b6d4` → `#0891b2`, text white, shadow cyan
- `secondary`: bg `#1a2540`, border `#253460`, text `#cbd5e1`
- `danger`: gradient red `#dc2626` → `#b91c1c`, text white
- `gold`: gradient amber `#f59e0b` → `#d97706`, text black, shadow amber
- `ghost`: transparent, hover `#1a2540`

### Table
- Header: `0.75rem`, `700`, uppercase, `0.07em` letter-spacing, `#475569`
- Cell: `0.875rem`, bottom border `rgba(255,255,255,.04)`
- Striped: alternate row `rgba(255,255,255,.02)`

### Badges (Status)
- Rounded-full, inline-flex, 11px font, uppercase tracking-wider
- Active: green, Pending: amber, Expired: red, Revoked: slate

## Motion

- `fadeUp`: 0.3s ease-out, translateY(20px) → translateY(0)
- Stagger: `.d1`–`.d8` com `animation-delay` de 80ms increments
- Hover: `transition-all .2s`, active scale `.97`
- Spinner: animate-spin (Tailwind nativo)
- Pulse: animate-pulse (Tailwind nativo)

## Elevation

- Glass cards: `backdrop-filter: blur(16px)`, shadow sutil
- KPI cards: hover translateY(-2px), box-shadow aumenta
- Nav active: `box-shadow: inset 0 0 16px rgba(6,182,212,.07), 0 0 8px rgba(6,182,212,.1)`
