# App layout spacing

Standard page spacing for the live app shell, derived from the **Campaign Creator** wizard (`variant="uxpilot"`). Hub screens (Campanhas, Dashboard, Clientes, etc.) use the same horizontal inset as the creator main column.

**Related:** [campaign-creator-design-system.md](./campaign-creator-design-system.md) (creator-specific shell, cards, stepper).

---

## Measured values — Campaign Creator (reference)

Source: `CampaignCreatorClient.tsx` grid, `CampaignCreatorUxChrome.tsx` header, `globals.css` `[data-campaign-creator-shell]`.

| Breakpoint | Left inset | Right inset | Main ↔ sidebar gap | Sidebar width | Max width |
|------------|------------|-------------|--------------------|---------------|-----------|
| `< lg` | `16px` (`px-4`) | `16px` (`px-4`) | — (stacked) | hidden | none (full bleed) |
| `lg` | `32px` (`lg:pl-8`) | `16px` (`lg:pr-4`) | `32px` (`gap-x-8`) | `256px` (`16rem`) | none |
| `xl` | `32px` | `16px` | `32px` | `288px` (`18rem`) | none |

Creator uses `.app-shell-breakout` to negate shell padding, then applies its own grid: `px-4 lg:pl-8 lg:pr-4 gap-x-8 lg:grid-cols-[minmax(0,1fr)_16rem] xl:grid-cols-[minmax(0,1fr)_18rem]`.

Hub pages (no right sidebar) use the **same left/right inset** as creator (`32px` / `16px` on desktop), not the wider symmetric `32px` / `32px` or centered `max-width` that caused extra whitespace.

---

## CSS variables (`globals.css` `:root`)

| Token | Value | Use |
|-------|-------|-----|
| `--app-content-max-width` | `1600px` | Optional cap for `DsFlatPanel centered` only — **not** applied to `.app-shell-content` |
| `--app-page-padding-x` | `1rem` (`16px`) | Horizontal padding below `lg` (`px-4`) |
| `--app-page-padding-x-lg` | `2rem` (`32px`) | Desktop left inset (`lg:pl-8`) |
| `--app-page-padding-x-right-lg` | `1rem` (`16px`) | Desktop right inset (`lg:pr-4`) |
| `--app-page-padding-y` | `1rem` | Mobile vertical padding |
| `--app-page-padding-y-lg` | `1.75rem` | Desktop vertical padding |
| `--app-page-gap-x` | `2rem` (`32px`) | Creator main ↔ sidebar gap (`gap-x-8`) |
| `--app-section-gap` | `1.25rem` | Default gap between page sections |
| `--app-section-gap-lg` | `1.5rem` | Loose section gap |
| `--app-sidebar-width` | `16rem` | Creator right sidebar (`lg`) |
| `--app-sidebar-width-xl` | `18rem` | Creator right sidebar (`xl`) |

Legacy tokens `--app-page-padding-x-sm` / `--app-page-padding-x-md` remain in `:root` but are **not** used by `.app-shell-content` (creator keeps `px-4` until `lg`).

---

## Utility classes

### `.app-shell-content`

Applied once in **`AppShellSkeleton`** (and legacy `AppShell`) on the inner wrapper around `{children}`.

- **Full bleed** within the main column (`w-full`, no `max-width`, no `mx-auto`)
- **Below `lg`:** symmetric `16px` horizontal padding
- **`lg+`:** asymmetric `32px` left / `16px` right — matches creator header and grid

Do **not** add `px-4`, `md:px-6`, or `max-w-*` on live route roots unless intentionally breaking out.

### `.app-shell-breakout`

Negates `.app-shell-content` padding (including asymmetric right at `lg+`). Used by **Campaign Creator** (`campaigns/new/layout.tsx`) so the wizard applies its own grid padding.

### `.app-page-shell` / `.app-page-shell--loose`

Vertical **section stack** only. No horizontal padding.

---

## React components

| Component | File | Role |
|-----------|------|------|
| `AppPageShell` | `src/components/layout/AppPageShell.tsx` | Canonical section stack |
| `UxPageMain` | `src/uxpilot-ui/adapters/UxPageMain.tsx` | `<AppPageShell as="main">` for live routes |

**Live routes using `UxPageMain`:** Campanhas, Dashboard (via `AppPageShell`), Clientes, Audiências, Relatórios, Criativos, Configurações, Alertas, Automações.

---

## Root cause of extra hub whitespace (fixed)

| Issue | Hub (before) | Creator |
|-------|--------------|---------|
| Max width | `max-width: 1600px` + `mx-auto` centered column | Full bleed, no cap |
| Right padding at `lg+` | `32px` symmetric | `16px` (`lg:pr-4`) |
| `sm`/`md` padding | `20px` / `24px` | `16px` until `lg` |

Hub pages looked like they reserved sidebar space on the right (extra `16px` padding + centering margins on wide viewports).

---

## Campaign Creator reference layout

| Area | Classes / tokens |
|------|------------------|
| Shell breakout | `.app-shell-breakout` on `[data-campaign-creator-shell]` |
| Header | `px-4 lg:pl-8 lg:pr-4`, `pt-3 pb-3 lg:pt-4 lg:pb-4` |
| Main grid | `px-4 lg:pl-8 lg:pr-4`, `gap-x-8`, `lg:grid-cols-[minmax(0,1fr)_16rem]`, `xl:…_18rem` |
| Sidebar width | `--app-sidebar-width` / `--app-sidebar-width-xl` |

---

## Migration checklist

1. Rely on **`AppShellSkeleton` → `.app-shell-content`** for page padding.
2. Wrap route content in **`UxPageMain`** or **`AppPageShell`** for section gaps.
3. Avoid **`max-w-*` / `mx-auto`** on full hub pages.
4. Mock-only UX Pilot pages under `uxpilot-ui/pages/content/` may keep legacy padding for standalone preview.

---

## Files

- `src/app/globals.css` — tokens, `.app-shell-content`, `.app-shell-breakout`
- `src/components/layout/AppPageShell.tsx`, `AppShellSkeleton.tsx`
- `src/uxpilot-ui/adapters/UxPageMain.tsx`
- Live routes: `CampaignsView`, `ClientsView`, `AudiencesView`, `DashboardContentLive`, `ReportsView`, `AlertsView`, `CreativesView`, `SettingsView`, `AutomationsRulesView`
- `src/app/[locale]/(app)/campaigns/new/layout.tsx` — `.app-shell-breakout`
