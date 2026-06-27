"use client";



import { useEffect, useState } from "react";

import { useLocale, useTranslations } from "next-intl";

import {
  Briefcase,
  Building2,
  Check,
  ChevronRight,
  Copy,
  CreditCard,
  Home,
  Landmark,
  Layers,
  LayoutGrid,
  Lightbulb,
  Megaphone,
  Tag,
  Target,
  Wallet
} from "lucide-react";



import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";

import { FilterSelectDropdown } from "@/components/FilterSelectDropdown";

import { FilterTextField } from "@/components/FilterTextField";

import { CopyCampaignModal } from "@/components/campaign-creator/CopyCampaignModal";

import { useClientPublishDefaults } from "@/hooks/useClientPublishDefaults";

import { usePublishAssets, type PublishAccountsError } from "@/hooks/usePublishAssets";

import type { BuyingType, CampaignDraftPayload, CampaignObjectiveKey } from "@/lib/campaign-draft";

import { objectivesForBuyingType, parseCampaignDraftPayload } from "@/lib/campaign-draft";

import { applyObjectiveDefaultNames } from "@/lib/campaign-draft-i18n";

import { useCampaignStepSubflow } from "@/components/campaign-creator/CampaignStepSubflowContext";

import { ObjectiveSelector } from "@/components/campaign-creator/ObjectiveSelector";
import { CampaignCreatorUxMobileSummary } from "@/uxpilot-ui/adapters/CampaignCreatorUxMobileSummary";

import { DsChoiceCard } from "@/design-system/components/DsChoiceCard";

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/cn";
import { OrionBrainCardFeedback } from "@/components/campaign-creator/OrionBrainResearchFeedback";
import { useCreatorBrainInsight } from "@/hooks/useCreatorBrainInsight";
import { openOrionBrainBenchmark } from "@/lib/campaign-creator/orion-brain-bridge";



const SPECIAL_CATEGORIES = [

  "CREDIT",

  "EMPLOYMENT",

  "HOUSING",

  "ISSUES_ELECTIONS_POLITICS"

] as const;



const SPECIAL_CATEGORY_ICONS: Record<(typeof SPECIAL_CATEGORIES)[number], LucideIcon> = {

  CREDIT: CreditCard,

  EMPLOYMENT: Briefcase,

  HOUSING: Home,

  ISSUES_ELECTIONS_POLITICS: Landmark

};



function BudgetChoiceCardCheck({ selected }: { selected: boolean }) {
  return (
    <span className="campaign-creator-budget-choice-card__check" aria-hidden>
      {selected ? <Check size={10} strokeWidth={3} /> : null}
    </span>
  );
}

function BudgetSpecialCategoryToggle({
  checked,
  label,
  icon: Icon,
  onToggle
}: {
  checked: boolean;
  label: string;
  icon: LucideIcon;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={onToggle}
      className={cn(
        "campaign-creator-budget-choice-card campaign-creator-budget-choice-card--tile",
        checked
          ? "campaign-creator-budget-choice-card--selected"
          : "campaign-creator-budget-choice-card--unselected"
      )}
    >
      <BudgetChoiceCardCheck selected={checked} />
      <span
        className={cn(
          "campaign-creator-budget-choice-card__icon",
          checked
            ? "campaign-creator-budget-choice-card__icon--selected"
            : "campaign-creator-budget-choice-card__icon--unselected"
        )}
        aria-hidden
      >
        <Icon size={18} strokeWidth={1.75} />
      </span>
      <span className="campaign-creator-budget-choice-card__label">{label}</span>
    </button>
  );
}

function BudgetLevelCard({
  selected,
  label,
  description,
  icon: Icon,
  recommendedBadge,
  onSelect
}: {
  selected: boolean;
  label: string;
  description: string;
  icon: LucideIcon;
  recommendedBadge?: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "campaign-creator-budget-choice-card campaign-creator-budget-choice-card--row",
        selected
          ? "campaign-creator-budget-choice-card--selected"
          : "campaign-creator-budget-choice-card--unselected"
      )}
    >
      <BudgetChoiceCardCheck selected={selected} />
      <span
        className={cn(
          "campaign-creator-budget-choice-card__icon campaign-creator-budget-choice-card__icon--inline",
          selected
            ? "campaign-creator-budget-choice-card__icon--selected"
            : "campaign-creator-budget-choice-card__icon--unselected"
        )}
        aria-hidden
      >
        <Icon size={18} strokeWidth={1.75} />
      </span>
      <span className="campaign-creator-budget-choice-card__content">
        <span className="campaign-creator-budget-choice-card__title-row">
          <span className="campaign-creator-budget-choice-card__label campaign-creator-budget-choice-card__label--inline">
            {label}
          </span>
          {recommendedBadge ? (
            <span className="campaign-creator-budget-choice-card__badge">{recommendedBadge}</span>
          ) : null}
        </span>
        <span className="campaign-creator-budget-choice-card__description">{description}</span>
      </span>
    </button>
  );
}


const BUDGET_ORION_TIP_KEYS: Record<CampaignObjectiveKey, `budgetOrionTip_${CampaignObjectiveKey}`> = {

  awareness: "budgetOrionTip_awareness",

  traffic: "budgetOrionTip_traffic",

  engagement: "budgetOrionTip_engagement",

  leads: "budgetOrionTip_leads",

  app: "budgetOrionTip_app",

  sales: "budgetOrionTip_sales"

};



function accountsErrorMessage(

  tAds: ReturnType<typeof useTranslations<"ads">>,

  code: PublishAccountsError

): string {

  switch (code) {

    case "account_not_linked":

      return tAds("adAccountsNotLinked");

    case "permission_denied":

      return tAds("adAccountsPermissionDenied");

    case "client_not_found":

      return tAds("adAccountsClientNotFound");

    case "meta_not_connected":

      return tAds("adAccountsMetaNotConnected");

    default:

      return tAds("adAccountsLoadFailed");

  }

}



function useCampaignStepEffects() {

  const locale = useLocale();

  const { payload, updatePayload, clients } = useCampaignDraft();

  const { accounts, accountsLoading, defaultAdAccountId, accountsError } = usePublishAssets(

    payload.clientSlug,

    payload.adAccountId

  );

  const { defaultTargeting } = useClientPublishDefaults(payload.clientSlug, locale);



  useEffect(() => {

    if (!payload.clientSlug || !clients.length) return;

    if (clients.some((c) => c.id === payload.clientSlug)) return;

    const match = clients.find((c) => c.slug === payload.clientSlug);

    if (match) updatePayload({ clientSlug: match.id });

  }, [clients, payload.clientSlug, updatePayload]);



  useEffect(() => {

    if (!payload.adAccountId && defaultAdAccountId) {

      updatePayload({ adAccountId: defaultAdAccountId });

    }

  }, [defaultAdAccountId, payload.adAccountId, updatePayload]);



  useEffect(() => {

    if (accountsLoading || !accounts.length) return;

    if (payload.adAccountId && !accounts.some((a) => a.metaAdAccountId === payload.adAccountId)) {

      updatePayload({ adAccountId: defaultAdAccountId ?? "" });

    }

  }, [accounts, accountsLoading, defaultAdAccountId, payload.adAccountId, updatePayload]);



  useEffect(() => {

    if (!defaultTargeting?.locations.length) return;

    updatePayload((p) => {

      const activeId = p.activeAdsetId ?? p.adsets[0]?.id;

      const adset = p.adsets.find((a) => a.id === activeId) ?? p.adsets[0];

      if (!adset || adset.targeting.locations.length) return p;

      return {

        ...p,

        adsets: p.adsets.map((a) =>

          a.id === activeId

            ? {

                ...a,

                targeting: {

                  ...a.targeting,

                  locations: defaultTargeting.locations,

                  ageMin: defaultTargeting.ageMin,

                  ageMax: defaultTargeting.ageMax,

                  customAudienceIds: defaultTargeting.includeAud,

                  excludedAudienceIds: defaultTargeting.excludeAud

                }

              }

            : a

        )

      };

    });

  }, [defaultTargeting, updatePayload]);



  return { accounts, accountsLoading, accountsError };

}




export function CampaignStep() {

  const t = useTranslations("campaignCreator");

  const tAds = useTranslations("ads");

  const { payload, updatePayload, clients, clientsLoading, activeNode } = useCampaignDraft();

  const { accounts, accountsLoading, accountsError } = useCampaignStepEffects();

  const { insight: brainInsight, loading: brainLoading, paused: brainPaused } = useCreatorBrainInsight({
    objective: payload.objective,
    activeNode,
    clientSlug: payload.clientSlug
  });

  const [copyModalOpen, setCopyModalOpen] = useState(false);

  const [copySourceName, setCopySourceName] = useState<string | null>(null);

  const [copyError, setCopyError] = useState<string | null>(null);

  const { section: activeSection, canGoTo, isSectionVisited, goTo } = useCampaignStepSubflow();



  function applyObjective(obj: CampaignObjectiveKey) {

    updatePayload((p) =>

      applyObjectiveDefaultNames(p, obj, (key) => t(key as Parameters<typeof t>[0]))

    );

  }



  function applyBuyingType(bt: BuyingType) {

    updatePayload((p) => {

      const objs = objectivesForBuyingType(bt);

      const nextObjective = objs.includes(p.objective) ? p.objective : objs[0]!;

      return { ...p, buyingType: bt, objective: nextObjective };

    });

  }



  async function applySnapshot(campaignId: string, campaignName?: string) {

    if (campaignId.startsWith("draft:")) return;

    setCopyError(null);

    try {

      const res = await fetch(

        `/api/campaigns/${encodeURIComponent(campaignId)}/creator-snapshot`

      );

      const j = (await res.json()) as {
        ok?: boolean;
        patch?: Partial<CampaignDraftPayload>;
        adAccountId?: string | null;
        clientSlug?: string | null;
        error?: string;
      };

      if (!j.ok || !j.patch) throw new Error("copyFailed");

      const merged = parseCampaignDraftPayload({
        ...payload,
        ...j.patch,
        clientSlug: j.patch.clientSlug || j.clientSlug || payload.clientSlug,
        adAccountId: j.patch.adAccountId || j.adAccountId || payload.adAccountId,
        copyFromCampaignEnabled: true,
        copyFromCampaignId: campaignId
      });

      updatePayload(merged);

      if (campaignName) setCopySourceName(campaignName);

    } catch (e) {

      setCopyError(e instanceof Error ? e.message : "copyFailed");

    }

  }

  async function handleCopySelect(campaignId: string, campaignName: string) {

    setCopyModalOpen(false);

    await applySnapshot(campaignId, campaignName);

  }



  return (

    <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col">

      <div className="campaign-creator-step-sticky-header space-y-3">

        <div>

          <h2 className="font-heading text-base font-semibold text-[var(--text-main)]">{t("treeCampaign")}</h2>

          <p className="mt-1 hidden text-xs text-[var(--text-dim)] sm:block">{t("campaignStepHint")}</p>

        </div>

        <div className="campaign-creator-choice-cards campaign-creator-choice-cards--2">

          <DsChoiceCard

            layout="inline"

            title={t("campaignSub_objective")}

            description={t("campaignSection_objective_hint")}

            icon={<Target size={18} />}

            accent={activeSection === "objective"}
            muted={!isSectionVisited("objective") && activeSection !== "objective"}
            visited={isSectionVisited("objective") && activeSection !== "objective"}
            onClick={() => goTo("objective")}
            className={!canGoTo("objective") ? "pointer-events-none" : undefined}

          />

          <DsChoiceCard

            layout="inline"

            title={t("campaignSub_budget")}

            description={t("campaignSection_budget_hint")}

            icon={<Wallet size={18} />}

            accent={activeSection === "budget"}
            muted={!isSectionVisited("budget") && activeSection !== "budget"}
            visited={isSectionVisited("budget") && activeSection !== "budget"}
            onClick={() => goTo("budget")}
            className={!canGoTo("budget") ? "pointer-events-none" : undefined}

          />

        </div>

      </div>

      <div className="campaign-creator-step-scroll min-h-0 flex-1 overflow-y-auto pt-5 pb-2">

        <div className="space-y-3">

      {activeSection === "objective" ? (

        <div className="campaign-creator-section-stack space-y-4">

          <div className="campaign-creator-copy-card campaign-creator-copy-card--lead">

            <div className="campaign-creator-copy-card__content">

              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">

                <Copy size={15} />

              </span>

              <div className="min-w-0 flex-1">

                <p className="font-heading text-sm font-semibold text-[var(--text-main)]">

                  {t("copyCampaignOptionalTitle")}

                </p>

                <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-dim)]">

                  {t("copyCampaignHint")}

                </p>

                {payload.copyFromCampaignId && copySourceName ? (

                  <p className="mt-1 truncate text-xs font-medium text-[var(--ui-accent)]">

                    {copySourceName}

                  </p>

                ) : null}

              </div>

            </div>

            <button

              type="button"

              onClick={() => setCopyModalOpen(true)}

              className="campaign-creator-copy-card__action ui-btn-secondary inline-flex shrink-0 items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs font-heading font-medium"

            >

              <Copy size={13} strokeWidth={2.25} />

              {t("copyCampaignSelectButton")}

              <ChevronRight size={14} strokeWidth={2.25} />

            </button>

          </div>

          {copyError ? (

            <p className="-mt-2 text-xs text-red-600">

              {copyError === "copyFailed" ? t("copyFailed") : copyError}

            </p>

          ) : null}

          <CopyCampaignModal

            open={copyModalOpen}

            onClose={() => setCopyModalOpen(false)}

            clientSlug={payload.clientSlug}

            selectedId={payload.copyFromCampaignId}

            onSelect={(id, name) => void handleCopySelect(id, name)}

          />

          <section className="campaign-creator-section space-y-3">

            <div className="campaign-creator-objective-fields-row">

              <FilterSelectDropdown

                className="ui-filter-panel-field ui-filter-panel-field--buying-type"

                icon={<Landmark size={13} />}

                label={t("buyingType")}

                placeholder={t("buyingType")}

                value={payload.buyingType}

                onChange={(v) => applyBuyingType(v as BuyingType)}

                clearable={false}

                options={[

                  { value: "auction", label: t("buyingAuction") },

                  { value: "reservation", label: t("buyingReservation") }

                ]}

              />

              <FilterSelectDropdown

                className="ui-filter-panel-field ui-filter-panel-field--client"

                icon={<Building2 size={13} />}

                label={tAds("clientLabel")}

                placeholder={tAds("selectClient")}

                value={payload.clientSlug}

                onChange={(clientId) =>

                  updatePayload({

                    clientSlug: clientId,

                    adAccountId: "",

                    copyFromCampaignEnabled: false,

                    copyFromCampaignId: null

                  })

                }

                options={clients.map((c) => ({ value: c.id, label: c.name }))}

                disabled={clientsLoading}

                clearable={false}

              />

              <FilterSelectDropdown

                className="ui-filter-panel-field ui-filter-panel-field--ad-account"

                valueClassName="max-w-none"

                icon={<Megaphone size={13} />}

                label={tAds("adAccount")}

                placeholder={!payload.clientSlug ? tAds("selectClient") : tAds("adAccountRequired")}

                value={payload.adAccountId}

                onChange={(adAccountId) => updatePayload({ adAccountId })}

                options={accounts.map((a) => ({ value: a.metaAdAccountId, label: a.label }))}

                disabled={!payload.clientSlug || accountsLoading}

                clearable={false}

              />

              <FilterTextField

                className="ui-filter-panel-field"

                icon={<Tag size={13} />}

                label={t("campaignName")}

                placeholder={t("campaignName")}

                value={payload.campaign.name}

                onChange={(name) =>

                  updatePayload((p) => ({

                    ...p,

                    campaign: { ...p.campaign, name }

                  }))

                }

              />

            </div>



            {accountsError ? (

              <p className="text-xs text-red-600">

                {accountsErrorMessage(tAds, accountsError)}{" "}

                {accountsError === "permission_denied" || accountsError === "meta_not_connected" ? (

                  <a href="/settings/integrations" className="font-semibold underline">

                    {tAds("adAccountsSettingsLink")}

                  </a>

                ) : accountsError === "account_not_linked" ? (

                  <a

                    href={`/clients/${encodeURIComponent(payload.clientSlug)}/settings`}

                    className="font-semibold underline"

                  >

                    {tAds("adAccountsClientLink")}

                  </a>

                ) : null}

              </p>

            ) : null}

            {!accountsLoading && !accountsError && payload.clientSlug && accounts.length === 0 ? (

              <p className="text-xs text-[var(--text-dim)]">

                {tAds("adAccountsEmpty")}{" "}

                <a href="/settings/integrations" className="font-semibold underline text-[var(--ui-accent)]">

                  {tAds("adAccountsSettingsLink")}

                </a>

                {" · "}

                <a

                  href={`/clients/${encodeURIComponent(payload.clientSlug)}/settings`}

                  className="font-semibold underline text-[var(--ui-accent)]"

                >

                  {tAds("adAccountsClientLink")}

                </a>

              </p>

            ) : null}

            {payload.buyingType === "reservation" ? (

              <p className="text-xs leading-snug text-[var(--text-dim)]">{t("buyingReservationHint")}</p>

            ) : null}

          </section>

          <ObjectiveSelector

            buyingType={payload.buyingType}

            objective={payload.objective}

            onBuyingTypeChange={applyBuyingType}

            onObjectiveChange={applyObjective}

            showHeader={false}

            compact

            hideBuyingType

          />

        </div>

      ) : null}



      {activeSection === "budget" ? (

        <div className="campaign-creator-budget-body">

          <header className="campaign-creator-budget-header">

            <h3 className="campaign-creator-budget-header__title">{t("campaignSub_budget")}</h3>

            <p className="campaign-creator-budget-header__subtitle">{t("budgetSectionDescription")}</p>

          </header>



          <div className="campaign-creator-budget-top-grid">
            <section className="campaign-creator-card campaign-creator-budget-side-card">
              <h4 className="campaign-creator-section-title">{t("budgetTypeLabel")}</h4>
              <div
                className="campaign-creator-budget-level-stack"
                role="radiogroup"
                aria-label={t("budgetTypeLabel")}
              >
                <BudgetLevelCard
                  selected={payload.campaign.budgetLevel === "campaign"}
                  label={t("budgetCbo")}
                  description={t("budgetCboHint")}
                  icon={Layers}
                  recommendedBadge={t("budgetRecommended")}
                  onSelect={() =>
                    updatePayload((p) => ({
                      ...p,
                      campaign: { ...p.campaign, budgetLevel: "campaign" }
                    }))
                  }
                />
                <BudgetLevelCard
                  selected={payload.campaign.budgetLevel === "adset"}
                  label={t("budgetAbo")}
                  description={t("budgetAboHint")}
                  icon={LayoutGrid}
                  onSelect={() =>
                    updatePayload((p) => ({
                      ...p,
                      campaign: { ...p.campaign, budgetLevel: "adset" }
                    }))
                  }
                />
              </div>
            </section>

            <section className="campaign-creator-card campaign-creator-budget-side-card">
              <label className="campaign-creator-section-title" htmlFor="campaign-daily-budget">
                {t("budgetDailyLabel")}
              </label>
              <div className="campaign-creator-budget-daily-input">
                <span className="campaign-creator-budget-daily-input__prefix" aria-hidden>
                  R$
                </span>
                <input
                  id="campaign-daily-budget"
                  type="number"
                  min={1}
                  step={1}
                  value={payload.campaign.dailyBudgetBRL}
                  onChange={(e) =>
                    updatePayload((p) => ({
                      ...p,
                      campaign: { ...p.campaign, dailyBudgetBRL: Number(e.target.value) || 0 }
                    }))
                  }
                  className="campaign-creator-budget-daily-input__field"
                  aria-label={tAds("dailyBudget")}
                />
              </div>

              <div className="campaign-creator-budget-special-inline">
                <span className="campaign-creator-budget-special-inline__label">{t("specialCategories")}</span>
                <div className="campaign-creator-budget-special-toggles">
                  {SPECIAL_CATEGORIES.map((cat) => {
                    const checked = payload.campaign.specialAdCategories.includes(cat);
                    return (
                      <BudgetSpecialCategoryToggle
                        key={cat}
                        checked={checked}
                        label={t(`specialCat_${cat}`)}
                        icon={SPECIAL_CATEGORY_ICONS[cat]}
                        onToggle={() =>
                          updatePayload((p) => ({
                            ...p,
                            campaign: {
                              ...p.campaign,
                              specialAdCategories: checked
                                ? p.campaign.specialAdCategories.filter((c) => c !== cat)
                                : [...p.campaign.specialAdCategories, cat]
                            }
                          }))
                        }
                      />
                    );
                  })}
                </div>
              </div>
            </section>
          </div>



          <div className="campaign-creator-budget-orion-tip">

            <div className="campaign-creator-budget-orion-tip__content">

              <span className="campaign-creator-budget-orion-tip__icon">

                <Lightbulb size={14} strokeWidth={2.25} aria-hidden />

              </span>

              <div className="campaign-creator-budget-orion-tip__text">

                {!brainPaused && !brainLoading && brainInsight?.kind === "data" ? (
                  <OrionBrainCardFeedback insight={brainInsight} compact showSampleBadge />
                ) : (
                  <p>{t(BUDGET_ORION_TIP_KEYS[payload.objective])}</p>
                )}

              </div>

            </div>

            <button
              type="button"
              onClick={openOrionBrainBenchmark}
              className="campaign-creator-budget-orion-tip__action ui-btn-accent-outline"
            >

              {t("budgetViewBenchmark")}

              <ChevronRight size={14} strokeWidth={2.5} aria-hidden />

            </button>

          </div>

        </div>

      ) : null}

      <CampaignCreatorUxMobileSummary />

        </div>

      </div>

    </div>

  );

}

