# Campaign Creator — Design System Catalog

Reusable components and CSS patterns used in the **Campaign Creator** wizard (`variant="uxpilot"`). Use this catalog when building new creator screens or porting patterns to other flows.

**Scope:** `[data-campaign-creator-shell]` in `globals.css` overrides accent tokens (violet in light, violet in dark) and defines card surfaces. All examples assume the creator shell is mounted.

**i18n namespace:** `campaignCreator` unless noted.

---

## Table of contents

1. [Shell & layout](#1-shell--layout)
   - [Campaign creator shell tokens](#campaign-creator-shell-tokens)
   - [CampaignCreatorUxChrome](#campaigncreatoruxchrome)
   - [CampaignCreatorUxSidebar](#campaigncreatoruxsidebar)
   - [CampaignCreatorStepPanel](#campaigncreatorsteppanel)
2. [Card surfaces](#2-card-surfaces)
   - [campaign-creator-sidebar-card](#campaign-creator-sidebar-card)
   - [campaign-creator-sidebar-card-inset](#campaign-creator-sidebar-card-inset)
   - [campaign-creator-card](#campaign-creator-card)
   - [campaign-creator-copy-card (dashed lead cards)](#campaign-creator-copy-card-dashed-lead-cards)
3. [Modals](#3-modals)
   - [CreatorModalShell](#creatormodalshell)
   - [CreatorAiModalShell](#creatoraimodalshell)
   - [CreatorAiModalParts](#creatoraimodalparts)
4. [Choice & selection](#4-choice--selection)
   - [BudgetChoiceCard / MultiSelectChoiceCard](#budgetchoicecard--multiselectchoicecard)
   - [campaign-creator-budget-choice-card (row/tile/chip)](#campaign-creator-budget-choice-card-rowtilechip)
   - [campaign-creator-objective-card](#campaign-creator-objective-card)
   - [ObjectiveSelector](#objectiveselector)
5. [Form controls](#5-form-controls)
   - [FormSelect](#formselect)
   - [FilterSelectDropdown](#filterselectdropdown)
   - [CampaignCreatorDateTimeField](#campaigncreatordatetimefield)
6. [Orion Brain sidebar](#6-orion-brain-sidebar)
   - [OrionBrainCardFeedback & badges](#orionbraincardfeedback--badges)
   - [OrionBrainResearchChecklist](#orionbrainresearchchecklist)
   - [CampaignCreatorBrainTips (sidebar composition)](#campaigncreatorbraintips-sidebar-composition)
7. [Summary & review patterns](#7-summary--review-patterns)
   - [CampaignCreatorSummaryModal](#campaigncreatorsummarymodal)
   - [Review step overview rows & badges](#review-step-overview-rows--badges)
   - [campaign-creator-orion-section-label](#campaign-creator-orion-section-label)
   - [CampaignCreatorScoreBar](#campaigncreatorscorebar)
8. [Buttons & pills](#8-buttons--pills)
   - [ui-btn-accent-outline](#ui-btn-accent-outline)
   - [AiCreditCostHint / ui-ai-credit-pill](#aicreditcosthint--ui-ai-credit-pill)
9. [Status & navigation chrome](#9-status--navigation-chrome)
   - [CampaignCreatorUxStatusToast](#campaigncreatoruxstatustoast)
   - [Wizard nav (ui-wizard-nav)](#wizard-nav-ui-wizard-nav)
10. [Compact tables (campaign listing)](#10-compact-tables-campaign-listing)
   - [ui-campaign-table-shell--compact](#ui-campaign-table-shell--compact)
   - [ui-campaign-table--compact](#ui-campaign-table--compact)
   - [ds-table-compact-badge / ds-table-compact-action](#ds-table-compact-badge--ds-table-compact-action)

---

## 1. Shell & layout

### Campaign creator shell tokens

**File:** `src/app/globals.css` (block starting at `[data-campaign-creator-shell]`)

**Purpose:** Scoped design tokens for the wizard — elevated card surfaces and violet accent in light mode.

**CSS variables (light):**

| Token | Typical value | Use |
|-------|---------------|-----|
| `--creator-card-bg` | `#ffffff` | Primary card background |
| `--creator-card-bg-inset` | `#e8edf3` | Inset panels, stat blocks |
| `--creator-card-border` | `rgba(15,23,42,0.12)` | Card borders |
| `--ui-accent` | violet | Primary accent (overrides global amber in shell) |
| `--ui-accent-muted` | violet 10% | Icon backgrounds, badges |
| `--ui-accent-border` | violet 32% | Outlines, dashed cards |
| `--creator-step-future-*` | muted violet | Inactive stepper steps |
| `--creator-choice-inactive-*` | muted violet | Unselected choice chips |

**Usage:** Wrap the wizard root with `data-campaign-creator-shell` (set in page layout / `CampaignCreatorClient`).

```tsx
<div data-campaign-creator-shell className="flex min-h-0 flex-1 flex-col">
  {/* wizard content */}
</div>
```

---

### CampaignCreatorUxChrome

**File:** `src/uxpilot-ui/adapters/CampaignCreatorUxChrome.tsx`

**Purpose:** Header, stepper, footer nav, mobile progress ring, and status toasts for `variant="uxpilot"`.

**Exports & API:**

| Export | Props | Role |
|--------|-------|------|
| `CampaignCreatorUxHeader` | — | Title, draft badge, close link |
| `CampaignCreatorUxStepper` | — | Horizontal 5-step stepper |
| `CampaignCreatorUxStepperRow` | `onPublish`, `publishing?` | Stepper + inline desktop nav |
| `CampaignCreatorUxNav` | `onPublish?`, `publishing?`, `placement?: "floating" \| "footer" \| "inline" \| "stepper"` | Back / Next / Publish |
| `CampaignCreatorUxMobileProgress` | — | Mobile score ring + step % |
| `CampaignCreatorUxStatusToast` | — | Auto toast for save/validation errors |
| `computeWizardProgressPercent` | `{ addAdMode, activeNode }` | 0–100 step progress |
| `computeWizardStepNumber` | `{ addAdMode, activeNode, campaignSection? }` | `{ current, total }` |

**Layout classes:**

- `campaign-creator-header` — top bar
- `campaign-creator-stepper-row` — stepper + nav row
- `campaign-creator-main-scroll` / `campaign-creator-step-scroll` — scroll regions
- `campaign-creator-footer-outer` / `campaign-creator-footer-band` — mobile footer nav
- `ui-wizard-nav--footer` / `ui-wizard-nav--stepper` — nav button sizing inside shell

**i18n:** `title`, `draftStatus`, `back`, `next`, `publish`, `wizardProgress`, `savedJustNow`, `savedAgo`, step labels (`treeCampaign`, `treeAdset`, …).

```tsx
<CampaignCreatorUxHeader />
<CampaignCreatorUxStepperRow onPublish={handlePublish} publishing={publishing} />
<CampaignCreatorUxNav placement="footer" onPublish={handlePublish} />
```

---

### CampaignCreatorUxSidebar

**File:** `src/uxpilot-ui/adapters/CampaignCreatorUxSidebar.tsx`

**Purpose:** Right column (lg+) with score card, Orion Brain tips, and summary modal trigger.

**Structure:**

```tsx
<div className="space-y-3 py-1">
  <SidebarProgressCard />   {/* campaign-creator-sidebar-card */}
  <CampaignCreatorBrainTips />
  <CampaignCreatorSummaryModal />
</div>
```

**i18n:** `campaignScore`, `wizardProgress`, `scoreHint`, `scoreBandGreat|Good|Fair`, `sidebarContextCampaign`.

---

### CampaignCreatorStepPanel

**File:** `src/components/campaign-creator/CampaignCreatorStepPanel.tsx`

**Purpose:** Animated wrapper when switching wizard nodes (`campaign` → `adset` → `ad` → `review`).

**Props:** `stepKey: string`, `direction: "forward" | "back" | "none"`, `children`.

**CSS:** `campaign-creator-step-panel`, animation classes `animate-creator-step-forward` / `animate-creator-step-back`.

```tsx
<CampaignCreatorStepPanel stepKey={activeNode} direction={stepDirection}>
  <CampaignStep />
</CampaignCreatorStepPanel>
```

---

## 2. Card surfaces

### campaign-creator-sidebar-card

**File:** `src/app/globals.css`

**Purpose:** Primary sidebar panel — score card, Orion Brain card, mobile summary.

**CSS:**

```css
.campaign-creator-sidebar-card {
  @apply rounded-xl border p-4;
  border-color: var(--creator-card-border);
  background: var(--creator-card-bg);
}
```

```tsx
<div className="campaign-creator-sidebar-card">
  <h3 className="font-heading text-sm font-semibold">…</h3>
</div>
```

---

### campaign-creator-sidebar-card-inset

**Purpose:** Nested stat/metric block inside a sidebar card — slightly darker inset surface.

**CSS:**

```css
.campaign-creator-sidebar-card-inset {
  @apply rounded-xl border;
  border-color: var(--creator-card-border);
  background: var(--creator-card-bg-inset);
}
```

**Used in:** Orion Brain stats (objective, CPC, forecast, confidence), summary modal sections, no-data guidance inset.

```tsx
<div className="campaign-creator-sidebar-card-inset mt-3 px-3">
  {/* StatRow items */}
</div>
```

---

### campaign-creator-card

**Purpose:** Standard content section card in step panels (budget groups, review sections, adset panels).

**Modifiers:** `campaign-creator-card--compact` (tighter padding).

```tsx
<section className="campaign-creator-card">
  <h3 className="campaign-creator-section-title">{t("sectionTitle")}</h3>
  …
</section>
```

Related layout: `campaign-creator-section`, `campaign-creator-section-stack`, `campaign-creator-section-title`.

---

### campaign-creator-copy-card (dashed lead cards)

**Purpose:** Call-to-action cards with dashed accent border — “load saved audience”, “configure ad set”, import flows.

**Files:** Pattern in `AdSetCompilerLeadCards.tsx`, `CampaignStep.tsx`, `AdStep.tsx`

**CSS:**

```css
.campaign-creator-copy-card { /* solid accent border */ }
.campaign-creator-copy-card--lead { /* dashed border, stronger accent tint */ }
.campaign-creator-copy-card__content { /* icon + text row */ }
.campaign-creator-copy-card__action { /* full-width button on mobile */ }
```

**Layout helper:** `campaign-creator-adset-two-col--equal-height` — two lead cards side by side.

```tsx
<div className="campaign-creator-copy-card campaign-creator-copy-card--lead">
  <div className="campaign-creator-copy-card__content">
    <span className="inline-flex h-8 w-8 … bg-[var(--ui-accent-muted)]">
      <Users size={15} />
    </span>
    <div>
      <p className="font-heading text-sm font-semibold">{t("loadSavedAudienceTitle")}</p>
      <p className="text-xs text-[var(--text-dim)]">{t("loadSavedAudienceHint")}</p>
    </div>
  </div>
  <button className="campaign-creator-copy-card__action ui-btn-secondary …">
    {t("loadSavedAudienceSelectButton")}
  </button>
</div>
```

**i18n:** `loadSavedAudienceTitle`, `loadSavedAudienceHint`, `adsetConfigurationHint`, `adsetSection_configuration_title`.

---

## 3. Modals

### CreatorModalShell

**File:** `src/components/campaign-creator/CreatorModalShell.tsx`

**Purpose:** Canonical modal for creator sub-flows (import, placements, zone picker, etc.) — header + scroll body + optional footer.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | — | Visibility |
| `onClose` | `() => void` | — | Close handler (Escape supported) |
| `title` | `string` | — | Header title |
| `subtitle` | `string?` | — | Muted subtitle |
| `titleIcon` | `ReactNode?` | — | 36×36 accent icon box |
| `showAiBadge` | `boolean?` | — | “AI” pill in header |
| `width` | `"md" \| "lg" \| "xl"` | `"lg"` | Panel size via `UxWizardModalPanel` |
| `contentClassName` | `string?` | — | Body padding override |
| `hideFooter` | `boolean?` | — | Skip default footer |
| Footer props | `onClear`, `onCancel`, `onPrimary`, `primaryLabel`, `primaryDisabled`, `primaryLoading`, `primaryForm`, … | — | Standard clear/cancel/save |

**Also exports:** `CreatorModalHeader` (standalone header).

**i18n:** `modalClearFields`, `modalCancel`, `modalSave`, `modalAiBadge`, `close`, `saving`.

```tsx
<CreatorModalShell
  open={open}
  onClose={onClose}
  title={t("importAdTitle")}
  width="lg"
  onCancel={onClose}
  onPrimary={handleSave}
  primaryLabel={t("modalSave")}
>
  {children}
</CreatorModalShell>
```

---

### CreatorAiModalShell

**File:** `src/components/campaign-creator/CreatorModalShell.tsx`

**Purpose:** Same as `CreatorModalShell` but forces `showAiBadge` and optionally renders a credits bar.

**Extra props:**

| Prop | Type | Description |
|------|------|-------------|
| `aiCredits` | `{ kind: AiCreditKind; calls?: number }?` | Shows `CreatorAiCreditsBar` |
| `creditsLearnMoreHref` | `string?` | Default `/settings?tab=general` |

**Also exports:** `CreatorAiCreditsBar({ kind, calls?, learnMoreHref? })`.

**i18n:** `aiCreditsWillBeUsed`, `ctaLearnMore`.

```tsx
<CreatorAiModalShell
  open={open}
  onClose={onClose}
  title={t("personaAiTitle")}
  aiCredits={{ kind: "persona_preview", calls: 1 }}
  onPrimary={runPreview}
>
  …
</CreatorAiModalShell>
```

---

### CreatorAiModalParts

**File:** `src/components/campaign-creator/CreatorAiModalParts.tsx`

**Purpose:** Shared building blocks for AI modals (persona, zone, audience forms).

| Export | Props | Use |
|--------|-------|-----|
| `CreatorAiProviderPicker` | `provider`, `onChange`, `providers: { gemini, claude }`, `disabled?`, `name?` | LLM provider radio cards |
| `CreatorAiPromptField` | `icon?`, `label`, `value`, `onChange`, `placeholder?`, `rows?`, `maxLength?`, `hint?` | Textarea with counter |
| `CreatorAiPreviewSection` | `title`, `hint?`, `children?`, `action?` | Accent-bordered preview block |

**i18n:** `aiProviderLabel`, `aiProviderGemini`, `aiProviderClaude`, `aiProviderGeminiRecommended`, `aiProviderOff`, `aiProviderClaudeHint`.

```tsx
<CreatorAiProviderPicker provider={provider} onChange={setProvider} providers={availability} />
<CreatorAiPromptField label={t("briefLabel")} value={brief} onChange={setBrief} maxLength={200} />
<CreatorAiPreviewSection title={t("previewTitle")} hint={t("previewHint")}>
  {previewContent}
</CreatorAiPreviewSection>
```

---

## 4. Choice & selection

### BudgetChoiceCard / MultiSelectChoiceCard

**File:** `src/components/campaign-creator/BudgetChoiceCard.tsx`

**Purpose:** Reusable selectable chips/tiles for budget level, placements, special categories.

**Exports:**

- `ChoiceCardCheck({ selected, compact? })` — corner check indicator
- `MultiSelectChoiceCard({ selected, label, icon?, iconInline?, disabled?, onToggle, size?: "md"|"sm" })`

**Variants (via CSS modifiers):** `--tile`, `--chip`, `--chip-sm`, `--chip-with-icon`, `--row` (inline in `CampaignStep`).

```tsx
<MultiSelectChoiceCard
  selected={selected}
  label={t("placementFacebook")}
  icon={Facebook}
  onToggle={() => toggle("facebook")}
  size="sm"
/>
```

---

### campaign-creator-budget-choice-card (row/tile/chip)

**File:** `src/app/globals.css`

**Purpose:** Visual system for all choice cards. States: `--selected`, `--unselected`.

**Key elements:** `__check`, `__icon`, `__label`, `__description`, `__badge`.

**Row variant example** (budget level in `CampaignStep`):

```tsx
<button
  className="campaign-creator-budget-choice-card campaign-creator-budget-choice-card--row campaign-creator-budget-choice-card--selected"
  role="radio"
  aria-checked={selected}
>
  <span className="campaign-creator-budget-choice-card__check">…</span>
  <span className="campaign-creator-budget-choice-card__icon">…</span>
  <div className="campaign-creator-budget-choice-card__content">
    <div className="campaign-creator-budget-choice-card__title-row">…</div>
    <p className="campaign-creator-budget-choice-card__description">…</p>
  </div>
</button>
```

---

### campaign-creator-objective-card

**Purpose:** Objective picker grid cells (modal + inline).

**Modifiers:** `--selected`, `--compact`, grid wrapper `campaign-creator-objective-grid--compact`.

**i18n:** `objective_*`, `objectiveModalTitle`, `objectiveModalHint`.

---

### ObjectiveSelector

**File:** `src/components/campaign-creator/ObjectiveSelector.tsx`

**Purpose:** Buying type + objective grid; uses `FormSelect` + objective cards.

**Props:** `buyingType`, `objective`, `onBuyingTypeChange`, `onObjectiveChange`, `showHeader?`, `compact?`, `hideBuyingType?`.

---

## 5. Form controls

### FormSelect

**File:** `src/components/ui/FormSelect.tsx`

**Purpose:** Portal-based custom select — used in creator for buying type, time pickers, enums.

**Props:**

| Prop | Type | Default |
|------|------|---------|
| `value` / `onChange` | `string` / `(v: string) => void` | — |
| `options` | `{ value, label, hint? }[]` | — |
| `placeholder` | `string` | — |
| `disabled`, `loading`, `clearable` | `boolean` | `clearable: true` |
| `menuPlacement` | `"bottom" \| "top"` | `"bottom"` |
| `usePortal` | `boolean` | `true` |

**CSS classes:** `ui-form-select-trigger`, `ui-form-select-trigger--open`, `ui-form-select-menu`, `ui-form-select-option`, `ui-form-select-option--active`.

```tsx
<FormSelect
  value={buyingType}
  onChange={(v) => setBuyingType(v as BuyingType)}
  options={[{ value: "auction", label: t("buyingTypeAuction") }]}
  placeholder={t("buyingType")}
  clearable={false}
/>
```

---

### FilterSelectDropdown

**File:** `src/components/FilterSelectDropdown.tsx`

**Purpose:** Labeled filter dropdown with icon — client/ad account fields in creator objective row.

**Notable prop:** `creatorField?: boolean` — applies inset creator styling:

```tsx
<FilterSelectDropdown
  creatorField
  icon={<Building2 size={14} />}
  label={t("client")}
  placeholder={t("selectClient")}
  options={clientOptions}
  value={clientSlug}
  onChange={setClientSlug}
/>
```

**CSS when `creatorField`:** inset background `var(--creator-card-bg-inset)`, border `var(--creator-card-border)`, accent border when open.

---

### CampaignCreatorDateTimeField

**File:** `src/components/campaign-creator/CampaignCreatorDateTimeField.tsx`

**Purpose:** Date + time picker for schedule fields (`datetime-local` UX).

**Props:** `value` (ISO local string), `onChange`, `disabled?`, `clearable?`, `aria-label` (required).

**CSS:** `campaign-creator-datetime-field`, `campaign-creator-datetime-field__time-select`, `campaign-creator-datetime-calendar-popover`, calendar day classes.

**Depends on:** `FormSelect` for hour/minute.

```tsx
<CampaignCreatorDateTimeField
  value={startAt}
  onChange={setStartAt}
  aria-label={t("scheduleStart")}
  clearable
/>
```

**i18n:** calendar strings via `campaignCreator` (`datetimeClear`, etc.).

---

## 6. Orion Brain sidebar

### OrionBrainCardFeedback & badges

**File:** `src/components/campaign-creator/OrionBrainResearchFeedback.tsx`

**Purpose:** Sidebar feedback strip — **minimal mode** shows only the consulted-campaigns badge; explanatory copy stays in modal.

| Export | Props | Sidebar behavior |
|--------|-------|------------------|
| `OrionBrainCardFeedback` | `insight`, `compact?`, `showSampleBadge?` | `compact={true}` → badge only, no benchmark paragraphs |
| `OrionBrainConsultedCampaignsBadge` | `count` | Internal; green pill |
| `OrionBrainSampleBadge` / `OrionBrainAgencyScannedBadge` | `count` | **Deprecated** — alias to unified badge |

**CSS:** `campaign-creator-orion-sample-badge` (green success pill).

**i18n:**

| Key | PT example |
|-----|------------|
| `brainConsultedCampaignsBadge` | "Consultou {count} campanhas" |
| `brainBenchmarkNote` | Modal only — benchmark explanation |
| `brainNoSyncedCampaigns` | Modal only — no synced campaigns |

```tsx
<OrionBrainCardFeedback insight={insight} compact />
```

---

### OrionBrainResearchChecklist

**Purpose:** Step-by-step research timeline (modal detail).

**Props:** `steps`, `compact?`, `highlightOnly?`, `className?`.

**i18n:** `brainResearchClientDone`, `brainResearchAgencySearch`, `brainResearchMetaDone`, `brainResearchBenchmarkFallback`, …

```tsx
<OrionBrainResearchChecklist steps={researchSteps} />
```

---

### CampaignCreatorBrainTips (sidebar composition)

**File:** `src/components/campaign-creator/CampaignCreatorBrainTips.tsx`

**Purpose:** Full Orion sidebar card. **Minimal sidebar stack:**

1. Header + pause/resume
2. `OrionBrainCardFeedback` (badge only)
3. `campaign-creator-sidebar-card-inset` stats (objective, metric, forecast, confidence + `CampaignCreatorScoreBar`)
4. `AiCreditCostHint` (`variant="pill"`, `consumed`)
5. `ui-btn-accent-outline` → opens modal with full checklist + recommendations

**i18n:** `brainTipsTitle`, `brainStatObjective`, `brainStatForecast`, `brainStatConfidence`, `brainViewRecommendations`, `brainModalTitle`, `aiCreditConsumedPill`.

---

## 7. Summary & review patterns

### CampaignCreatorSummaryModal

**File:** `src/components/campaign-creator/CampaignCreatorSummaryModal.tsx`

**Purpose:** “Contexto da campanha” modal from sidebar — draft overview with score, checklist, hero cards.

**Internal patterns (copy to other screens):**

| Pattern | CSS classes | Description |
|---------|-------------|-------------|
| Score ring | `campaign-creator-summary-score-panel`, `campaign-creator-summary-score-ring`, `__value` | SVG ring + band label |
| Section card | `campaign-creator-sidebar-card-inset` + `campaign-creator-summary-section-card` | Inset grouped rows |
| Overview row | `campaign-creator-review-overview-row`, `__icon--neutral\|accent\|success\|violet` | Icon + label + value |
| Badge | `campaign-creator-review-badge--accent\|neutral\|success` | Inline status pills |
| Status badge | `campaign-creator-summary-status-badge--complete\|incomplete` | Section completeness |
| Source hero | `campaign-creator-summary-source-hero`, `__icon` | Accent hero for creation mode |
| Source chip | `campaign-creator-summary-chip--accent\|neutral\|muted` | Persona/zone chips |
| Checklist group | `campaign-creator-summary-checklist-wrap`, `campaign-creator-summary-checklist-grid`, `campaign-creator-summary-checklist-item--complete\|incomplete` | Grouped completion grid |
| Metric row | `campaign-creator-summary-metric-row` | Budget highlight row |
| Orion section | `campaign-creator-orion-section-label` | Uppercase section heading |

**Shell:** Uses `CreatorModalShell` with `width="xl"`.

**i18n:** `summaryModalTitle`, `summaryBadgeComplete`, `summaryBadgeIncomplete`, `campaignScore`, `scoreBand*`, checklist labels.

```tsx
<CampaignCreatorSummaryModal open={open} onClose={onClose} />
```

---

### Review step overview rows & badges

**File:** `src/components/campaign-creator/steps/ReviewStep.tsx`

**Purpose:** Same row/badge primitives as summary modal, embedded in review step.

**Components (local):** `OrionSectionLabel`, `ReviewOverviewRow`, `ReviewBadge` — mirror `CampaignCreatorSummaryModal` patterns.

**CSS:** `campaign-creator-review-overview-row`, `campaign-creator-review-summary-row__label`, `campaign-creator-review-summary-row__value`, `campaign-creator-review-badge`, `campaign-creator-review-matrix` (comparison table).

```tsx
<ReviewOverviewRow
  icon={<Target size={16} />}
  iconTone="accent"
  label={t("reviewObjective")}
  value={<ReviewBadge tone="accent">{objectiveLabel}</ReviewBadge>}
/>
```

---

### campaign-creator-orion-section-label

**CSS:**

```css
.campaign-creator-orion-section-label {
  @apply text-xs font-semibold uppercase tracking-wide text-[var(--text-dimmer)];
}
```

**Usage:** Modal section titles (Brain, Summary, Review).

```tsx
<h3 className="campaign-creator-orion-section-label">{t("brainModalEstimates")}</h3>
```

---

### CampaignCreatorScoreBar

**File:** `src/components/campaign-creator/CampaignCreatorScoreBar.tsx`

**Purpose:** Gradient confidence/score bar (red → yellow → orange → green) with mask reveal.

**Props:** `value: number` (0–100).

```tsx
<CampaignCreatorScoreBar value={insight.confidence} />
```

---

## 8. Buttons & pills

### ui-btn-accent-outline

**File:** `src/app/globals.css`

**Purpose:** Secondary CTA with brand accent — “Ver recomendações”, “Contexto da campanha”, sync-style actions inside creator.

```css
.ui-btn-accent-outline {
  border-color: var(--ui-accent-border);
  color: var(--ui-accent);
}
.ui-btn-accent-outline:hover:not(:disabled) {
  background: var(--ui-accent-hover);
}
```

**Creator usage:** Often combined with `rounded-lg px-3 py-2 text-xs font-heading font-semibold w-full`.

```tsx
<button type="button" className="ui-btn-accent-outline mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-heading font-semibold">
  {t("brainViewRecommendations")}
  <ChevronRight size={14} />
</button>
```

---

### AiCreditCostHint / ui-ai-credit-pill

**File:** `src/components/ui/AiCreditCostHint.tsx`

**Purpose:** Show estimated or consumed AI credits.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `kind` | `AiCreditKind` | — | Credit pricing key |
| `calls` | `number` | `1` | Multiplier for estimate |
| `variant` | `"hint" \| "pill"` | `"hint"` | Bordered hint vs compact pill |
| `consumed` | `boolean` | `false` | Past tense / charged amount |
| `consumedAmount` | `number?` | — | Override charged credits |

**CSS:** `.ui-ai-credit-pill` — rounded-full, accent border/background, 10px text.

**i18n:** `aiActionCreditCost` (hint), `aiCreditCostPill`, `aiCreditConsumedPill`.

```tsx
{/* Sidebar — after successful brain query */}
<AiCreditCostHint kind="creator_brain" variant="pill" consumed consumedAmount={insight.creditCost} />

{/* Form — before action */}
<AiCreditCostHint kind="persona_preview" calls={1} />
```

---

## 9. Status & navigation chrome

### CampaignCreatorUxStatusToast

**File:** `src/uxpilot-ui/adapters/CampaignCreatorUxChrome.tsx`

**Purpose:** Floating toast for validation errors, save success, save failure.

**CSS:** `campaign-creator-status-toast`, `campaign-creator-status-toast__inner`, `campaign-creator-status-toast__inner--solid` + alert variant.

Auto-wired via `useCampaignDraft()` — no props.

---

### Wizard nav (ui-wizard-nav)

**Scoped in shell:** Footer/stepper nav buttons use `ui-wizard-nav__btn`, `--back`, `--next` with creator-specific min-width on mobile.

**Button classes:** `ui-btn-secondary` (back), `ui-btn-accent` (next/publish).

---

## 10. Compact tables (campaign listing)

Dense tables for **Campaigns hub** listing (`CampaignsHubClient`) — same card surfaces and badge/action patterns as the creator, with ~40–48px row height.

**File:** `src/app/globals.css` (after `.ui-campaign-table-chevron`)

### ui-campaign-table-shell--compact

Creator-style inset card wrapper for grouped tables (drafts, preset groups).

| Element | Default shell | Compact |
|---------|---------------|---------|
| Border radius | `rounded-2xl` | `rounded-xl` |
| Background | `--surface-card` | `--creator-card-bg` |
| Header padding | `px-4 py-3.5` | `px-3 py-2.5` |
| Title | `text-base sm:text-lg` | `text-sm` |
| Section icon | `h-9 w-9` | `h-7 w-7` |

```tsx
<div className="ui-campaign-table-shell ui-campaign-table-shell--compact">
  <div className="ui-campaign-table-shell__header">…</div>
  <table className="ui-campaign-table ui-campaign-table--compact">…</table>
</div>
```

### ui-campaign-table--compact

| Token | Value | Use |
|-------|-------|-----|
| Cell text | `text-xs` | All body cells |
| Column header row | Transparent bg, `border-bottom` via `--creator-card-border` | No solid thead bar |
| Header labels | `text-[10px]`, `py-1.5 px-2.5`, `font-semibold uppercase tracking-wide`, `text-dimmer` | Same tone as `campaign-creator-orion-section-label` |
| Body cells | `py-2 px-2.5` | ~44px row height |
| Campaign name link | `text-xs` via `.ui-campaign-table-name` | Accent link |
| Footer row | Transparent bg, `border-top` via `--creator-card-border` | Totals row — subtle separator only |

**Table header styling (all `.ui-campaign-table` variants):** thead uses a transparent background and a single bottom border instead of `--surface-thead` fill. Sticky header cells inherit `--surface-sticky-thead`, scoped on `.ui-campaign-table-shell` to `--surface-card` (regular) or `--creator-card-bg` (compact shell).

**Sticky columns:** use `STICKY_*_COMPACT` from `src/lib/campaign-table-sticky.ts` (narrower status column, `left-12` name offset). Sticky thead/footer cells use the shell-scoped `--surface-sticky-thead` so they stay opaque while scrolling without a dark bar.

**Metric columns:** pass `compact` to `CampaignTableHead` / `CampaignTableCell` so padding comes from the table modifier only.

### ds-table-compact-badge / ds-table-compact-action

Inline status pills and row actions (no full-size buttons).

| Class | Use |
|-------|-----|
| `ds-table-compact-badge--accent` | Draft / violet status |
| `ds-table-compact-badge--success` | Active status |
| `ds-table-compact-badge--neutral` | Paused / inactive |
| `ds-table-compact-action` | Link-style action (e.g. “Continuar edição”) |
| `ds-table-compact-action--danger` | Ghost discard (icon + label) |

```tsx
<span className="ds-table-compact-badge ds-table-compact-badge--accent">{t("statusDraft")}</span>
<Link href={href} className="ds-table-compact-action">{t("resumeDraft")}</Link>
<button type="button" className="ds-table-compact-action ds-table-compact-action--danger">
  <Trash2 size={12} /> {t("discardDraft")}
</button>
```

**Primary usage:** `src/components/CampaignsHubClient.tsx` — drafts section + preset-group tables.

---

## Quick reference — file map

| Pattern | Primary file |
|---------|--------------|
| Modal shell | `src/components/campaign-creator/CreatorModalShell.tsx` |
| AI modal parts | `src/components/campaign-creator/CreatorAiModalParts.tsx` |
| Choice cards | `src/components/campaign-creator/BudgetChoiceCard.tsx` |
| Lead cards | `src/components/campaign-creator/AdSetCompilerLeadCards.tsx` |
| Orion feedback | `src/components/campaign-creator/OrionBrainResearchFeedback.tsx` |
| Brain sidebar | `src/components/campaign-creator/CampaignCreatorBrainTips.tsx` |
| Summary modal | `src/components/campaign-creator/CampaignCreatorSummaryModal.tsx` |
| Review step | `src/components/campaign-creator/steps/ReviewStep.tsx` |
| Form select | `src/components/ui/FormSelect.tsx` |
| Filter select | `src/components/FilterSelectDropdown.tsx` |
| Date/time | `src/components/campaign-creator/CampaignCreatorDateTimeField.tsx` |
| UX chrome | `src/uxpilot-ui/adapters/CampaignCreatorUxChrome.tsx` |
| UX sidebar | `src/uxpilot-ui/adapters/CampaignCreatorUxSidebar.tsx` |
| CSS tokens | `src/app/globals.css` (`[data-campaign-creator-shell]`, `.campaign-creator-*`, `.ui-campaign-table--compact`) |
| Campaigns listing tables | `src/components/CampaignsHubClient.tsx` |

---

## Related docs

- [design-system.md](./design-system.md) — global tokens and `ui-*` utilities
- [design-system/themes.md](./design-system/themes.md) — theme overrides
