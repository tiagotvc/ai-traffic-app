# App layout spacing

Standard page spacing for the live app shell, derived from the **Campaign Creator** wizard (`variant="uxpilot"`). Use these tokens and utilities so hub screens (Campanhas, Dashboard, Clientes, etc.) share the same horizontal breathing room as the creator.

**Related:** [campaign-creator-design-system.md](./campaign-creator-design-system.md) (creator-specific shell, cards, stepper).

---

## CSS variables (`globals.css` `:root`)

| Token | Value | Use |
|-------|-------|-----|
| `--app-content-max-width` | `1600px` | Max width of main content column |
| `--app-page-padding-x` | `1rem` | Mobile horizontal padding (`px-4`) |
| `--app-page-padding-x-sm` | `1.25rem` | `sm` breakpoint (`px-5`) |
| `--app-page-padding-x-md` | `1.5rem` | `md` breakpoint (`px-6`) |
| `--app-page-padding-x-lg` | `2rem` | Desktop left/right base (`lg:px-8` / `lg:pl-8`) |
| `--app-page-padding-x-right-lg` | `1rem` | Creator grid right column inset (`lg:pr-4`) |
| `--app-page-padding-y` | `1rem` | Mobile vertical padding (`py-4`) |
| `--app-page-padding-y-lg` | `1.75rem` | Desktop vertical padding (`lg:py-7`) |
| `--app-section-gap` | `1.25rem` | Default gap between page sections (`space-y-5`) |
| `--app-section-gap-lg` | `1.5rem` | Loose section gap (`space-y-6`) |
| `--app-sidebar-width` | `16rem` | Creator right sidebar (`lg`) |
| `--app-sidebar-width-xl` | `18rem` | Creator right sidebar (`xl`) |

---

## Utility classes

### `.app-shell-content`

Applied once in **`AppShellSkeleton`** (and legacy `AppShell`) on the inner wrapper around `{children}`. Owns **all horizontal and vertical page padding** and `max-width: var(--app-content-max-width)`.

Do **not** add `px-4`, `md:px-6`, or `max-w-*` on live route roots unless you are intentionally breaking out (see below).

### `.app-shell-breakout`

Negates `.app-shell-content` padding. Used by **Campaign Creator** layout (`campaigns/new/layout.tsx`) so the wizard can apply its own grid padding (`lg:pl-8 lg:pr-4`, sidebar columns).

### `.app-page-shell` / `.app-page-shell--loose`

Vertical **section stack** only (`display: flex; flex-direction: column; gap: var(--app-section-gap)`). No horizontal padding.

---

## React components

| Component | File | Role |
|-----------|------|------|
| `AppPageShell` | `src/components/layout/AppPageShell.tsx` | Canonical section stack; props: `gap`, `as`, `className` |
| `UxPageMain` | `src/uxpilot-ui/adapters/UxPageMain.tsx` | Thin wrapper: `<AppPageShell as="main">` for UX Pilot live routes |

**Example — live hub route:**

```tsx
export function CampaignsView() {
  return (
    <UxPageMain gap="loose">
      <CampaignsHubClient useUxChrome />
    </UxPageMain>
  );
}
```

**Example — page with internal sections only (padding from shell):**

```tsx
export function DashboardContentLive() {
  return (
    <AppPageShell as="main" className="flex-1 overflow-y-auto">
      <PageToolbar … />
      <div className="tab-transition space-y-5">…</div>
    </AppPageShell>
  );
}
```

---

## Campaign Creator reference layout

| Area | Classes / tokens |
|------|------------------|
| Shell breakout | `.app-shell-breakout` on `[data-campaign-creator-shell]` |
| Header | `px-4 lg:pl-8 lg:pr-4`, `pt-3 pb-3 lg:pt-4 lg:pb-4` |
| Main grid | `px-4 lg:pl-8 lg:pr-4`, `gap-x-8`, `lg:grid-cols-[minmax(0,1fr)_16rem]`, `xl:…_18rem` |
| Section stack (steps) | `.campaign-creator-section-stack` → `space-y-6` |
| Sidebar cards | `.campaign-creator-sidebar-card` → `p-4` |
| Step content cards | `.campaign-creator-card` → default `p-4`, `--compact` tighter |

---

## Migration checklist

When adding or refactoring a live screen:

1. Rely on **`AppShellSkeleton` → `.app-shell-content`** for page padding — remove duplicate `px-*` / `py-*` on `<main>`.
2. Wrap route content in **`UxPageMain`** or **`AppPageShell`** for section gaps.
3. Avoid **`max-w-4xl` / `max-w-5xl` / `mx-auto`** on full hub pages; use full `--app-content-max-width` unless the UX is intentionally narrow (forms, legal, invite).
4. **`DsFlatPanel` `centered`** now maps to `--app-content-max-width`, not `max-w-5xl`.
5. Mock-only UX Pilot pages under `uxpilot-ui/pages/content/` may keep legacy padding for standalone preview; live adapters should not double-pad.

---

## Before / after (key screens)

### Campanhas hub

| | Before | After |
|---|--------|--------|
| Shell | `AppShellSkeleton` `lg:px-8` + inner `max-w-[1600px]` | `.app-shell-content` (same effective padding, tokenized) |
| Route | `UxPageMain` added **`px-4 md:px-6 py-5`** again | `UxPageMain` → section gap only (`gap="loose"`) |
| Content | ~56px inset each side on desktop (double pad) | ~32px inset (`--app-page-padding-x-lg`), full 1600px table width |

### Dashboard (Destaques)

| | Before | After |
|---|--------|--------|
| Shell | Same as above | `.app-shell-content` |
| Route | `DashboardContentLive` used `px-0 py-0` (single pad — already wider) | `AppPageShell as="main"` — consistent section gap, no extra horizontal pad |
| Content | Full shell width | Unchanged width; aligned tokens and gap rhythm with Campanhas |

---

## Files touched (spacing standard)

- `src/app/globals.css` — tokens + `.app-shell-content`, `.app-shell-breakout`, `.app-page-shell`
- `src/components/layout/AppPageShell.tsx` — new
- `src/components/layout/AppShellSkeleton.tsx`, `AppShell.tsx`
- `src/uxpilot-ui/adapters/UxPageMain.tsx`
- Live routes: `CampaignsView`, `ClientsView`, `AudiencesView`, `DashboardContentLive`, `ReportsView`, `AlertsView`, `CreativesView`, `SettingsContentLive`, `AutomationsRulesView`
- `src/app/[locale]/(app)/campaigns/new/layout.tsx` — `.app-shell-breakout`
- `src/design-system/components/DsFlatPanel.tsx` — `centered` uses app max width
