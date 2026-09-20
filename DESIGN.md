# Design Brief

## Direction

**Night Ledger** — a warm, intimate dark system for personal savings *and* music: deep espresso-charcoal canvas, luminous mint-jade progress, warm amber highlights.

## Tone

Refined dark editorial with a tactile, glowing quality — deliberately avoids both the finance cliché (navy/corporate blue) and the AI cliché (purple gradients).

## Differentiation

**The Ledger Glow**: progress and playback both emit a soft jade luminance that reads like a lit ledger line — paired with oversized tabular monospace figures for Rupiah amounts and track durations.

## Color Palette

| Token      | OKLCH         | Role                                    |
| ---------- | ------------- | --------------------------------------- |
| background | 0.16 0.015 55 | Deep warm espresso charcoal canvas      |
| foreground | 0.94 0.008 75 | Warm off-white body text                |
| card       | 0.21 0.018 55 | Elevated goal cards & track rows        |
| primary    | 0.78 0.17 165 | Luminous mint-jade — progress, play, CTAs |
| accent     | 0.78 0.14 68  | Warm amber — countdown chips, highlights |
| muted      | 0.26 0.02 55  | Inactive chips, secondary surfaces      |
| destructive | 0.66 0.19 27 | Delete target / delete deposit / delete track |
| player     | 0.22 0.02 55  | Mini-player dock surface (glass, 92%)   |
| track-active | 0.31 0.06 165 | Playing track row fill (jade-tinted)  |
| seek-track | 0.34 0.022 55 | Unplayed seek/waveform bar              |
| dropzone   | 0.2 0.018 55  | Upload dropzone fill                    |
| field      | 0.19 0.017 55 | Labeled input fill (settings forms)     |
| field-border | 0.32 0.022 55 | Input resting border                 |
| field-focus | 0.78 0.17 165 | Input focus ring (jade)               |
| field-invalid | 0.66 0.19 27 | Input invalid border                |
| helper     | 0.62 0.014 70 | Helper text under fields                |
| error-text | 0.74 0.16 27  | Inline validation error text            |
| disabled   | 0.24 0.018 55 | Disabled button/input fill              |
| badge-configured | 0.32 0.07 165 | 'Terkonfigurasi' badge fill      |
| badge-unconfigured | 0.33 0.06 68 | 'Belum terkonfigurasi' badge fill |
| result-success | 0.3 0.06 165 | Last-sent success row fill           |
| result-failure | 0.3 0.06 27 | Last-sent failure row fill            |

## Typography

- Display: **Space Grotesk** — headings, page titles, track titles; tight tracking
- Body: **DM Sans** — UI labels, creator names, descriptions, form text
- Mono: **Geist Mono** — Rupiah amounts, percentages, **track durations/timecodes** (tabular)
- Scale: hero `text-4xl font-bold tracking-tight`, h2 `text-2xl font-bold`, label `.label-eyebrow`, body `text-sm`/`text-base`

## Elevation & Depth

Three-tier surface hierarchy: `background` canvas → `card` elevated cards/rows with 1px warm border → `popover` for dialogs; the mini-player adds a fourth floating tier (`player` glass + `shadow-player-dock`), never pure black or neon glow.

## Structural Zones

| Zone            | Background                        | Border                    | Notes                                                        |
| --------------- | --------------------------------- | ------------------------- | ------------------------------------------------------------ |
| App shell       | `app-shell-bg` + `.bg-scrim`      | —                         | User image behind scrim; default = plain `background`        |
| Top bar (mobile)| `.surface-glass`                  | `border-b border-border`  | Sticky, blurred, readable over any uploaded background        |
| Top bar (desktop)| `.surface-glass`                 | `border-b border-border`  | Right cluster: nav links, then sign-in button / identity chip |
| Sign-in affordance| `.signin-button` / `.identity-chip` | 1px glass border     | Compact pill in top bar; avatar = jade gradient disc          |
| Bottom nav      | `.surface-glass`                  | `border-t border-border`  | Fixed, 4 items (Beranda/Target/Musik/Pengaturan), active = jade pill |
| Sidebar (desktop)| `sidebar` token                  | `border-r border-border`  | Active item = `sidebar-accent` rounded pill                  |
| Content         | transparent over shell            | —                         | Cards carry their own `card` surface; page padding `px-4 md:px-8` |
| Mini-player dock| `.surface-player`                 | 1px `player-border`       | Fixed: above bottom nav on `<md`, at viewport base on `≥md`; `shadow-player-dock` |
| Full player     | `background` + `--gradient-subtle`| —                         | Full-screen overlay, `z-50`, slides up via `player-rise`     |
| Dialogs         | `popover`                         | `border-border`           | Confirmation dialogs for delete actions                      |
| Admin reminder  | transparent over shell            | —                         | `/admin` only; stacked `card` sections, max-w-2xl centered    |
| Admin form card | `card`                            | `border-border`           | Labeled fields + helper/error text; submit row at card base   |

## Spacing & Rhythm

Mobile-first with `px-4` page gutters (→ `px-8` on desktop), `gap-4` between cards, `space-y-2` inside list rows, generous `p-5`/`p-6` card padding; large 24px card radii create a soft, app-like rhythm. Musik page uses `.pb-player-dock` so content clears the mini-player + nav.

## Component Patterns

- Buttons: full-pill (`rounded-full`), primary = jade gradient with `shadow-elevated`; secondary = `secondary` surface; destructive = `destructive`; hover lifts with `-translate-y-0.5`
- Cards: `rounded-3xl` (24px), `card` background, 1px `border`, `shadow-elevated`; goal cards lead with a 16:9 photo thumbnail
- Badges/chips: full-pill, `muted` surface for neutral, `accent/15` for countdown, `primary/15` for completed
- Progress: pill track (`muted`) + jade gradient fill with `.glow-primary`, percentage in `.font-figure` at `text-3xl`
- **Track row**: `.track-row` (transparent → `track-hover`), 44px circular jade play button, title `font-display font-semibold`, creator `text-sm text-muted-foreground`, duration `.font-figure text-xs`; playing row = `.track-row-active` + `animate-equalizer` bars
- **Search field**: full-pill, `card` surface, 1px `border`, leading magnifier; focus = `ring-2 ring-ring`; loading = spinner in trailing slot; empty = centered muted icon + Indonesian copy
- **Dropzone**: `.dropzone` dashed 1px, `rounded-3xl`, centered upload icon + helper text + jade "Pilih File" pill; drag-over = `.dropzone-active`; progress = jade bar with `.font-figure` percentage
- **Mini-player**: `.surface-player`, `rounded-2xl`, `mx-3 mb-2`; 44px album thumb, title/creator stacked, play/pause + expand chevron; 2px jade progress line pinned to top edge
- **Full player**: large 1:1 art with jade gradient fallback, title `text-2xl font-bold`, seek bar `h-1.5` rail + `.seek-fill`, timecodes `.font-figure text-xs`, transport row (shuffle-free): prev / play-pause 64px / next
- **Form field**: `.field-label` above, `.field-input` (resting `field` fill + `field-border`, focus = jade ring, `aria-invalid` = destructive border), `.field-helper` below; `.field-error` replaces helper on invalid
- **Disabled action**: `.btn-disabled` — flat `disabled` fill, muted label, no glow or lift; always paired with a short reason line so the block is explained
- **Status badge**: `.badge-status` full-pill; `.badge-configured` jade for 'Terkonfigurasi', `.badge-unconfigured` amber for 'Belum terkonfigurasi'
- **Last-sent result row**: `.result-row` with `.result-success` (jade) or `.result-failure` (destructive) tint; leading status icon, timestamp in `.font-figure`
- **Sign-in / identity**: `.signin-button` compact glass pill in the top bar; signed-in swaps to `.identity-chip` (`.identity-avatar` jade gradient disc + mono initial + principal label)

## Motion

- Entrance: cards fade + rise 8px over 300ms staggered by 60ms; mini-player enters with `player-rise` (translateY 100% → 0, 320ms)
- Hover: `-translate-y-0.5` + shadow deepen, 200ms `ease-out`; track rows shift background only
- Decorative: `pulse-glow` on progress fill at 100%; `animate-equalizer` bars on the playing row; `marquee` for overlong track titles in the mini-player

## Constraints

- Dark theme is the default and primary design target; light mode is a tuned warm-parchment fallback
- All colors via semantic OKLCH tokens — no hex, `rgb()`, or arbitrary Tailwind color classes
- Background image is user-supplied and arbitrary: every surface over it must use `.surface-glass` / `.surface-player` / `.bg-scrim` for AA+ legibility
- Currency always Rupiah (`Rp`) with Indonesian thousand separators, rendered in Geist Mono tabular figures
- Mobile-first: bottom nav on `<md`, sidebar on `≥md`; touch targets ≥44px
- UI copy in Indonesian; savings screens stay visually unchanged by the music feature
- No playlist/favorites and no genre/duration filter UI
- Admin page is `/admin`, gated to admin role; non-admins see a rejection state and are redirected
- Reminder config stores one Indonesian (+62) number and Twilio credentials; secrets are never re-displayed in full
- Reminder copy is fixed Indonesian; no custom templates, no WhatsApp bot, no per-rule or multi-recipient scheduling

## Signature Detail

The **Ledger Glow** — a jade gradient fill wrapped in a soft outer luminance, applied to both savings progress and the music seek bar, making progress feel physically lit rather than merely colored.

