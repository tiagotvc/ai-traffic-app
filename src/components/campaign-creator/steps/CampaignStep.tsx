"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Building2, Tag, Wallet } from "lucide-react";

import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";
import { FormField } from "@/components/ui/FormField";
import { FormSelect } from "@/components/ui/FormSelect";
import { FormFieldSkeleton } from "@/components/ui/FormSkeleton";
import { useClientPublishDefaults } from "@/hooks/useClientPublishDefaults";
import { usePublishAssets, type PublishAccountsError } from "@/hooks/usePublishAssets";
import type { CampaignDraftPayload } from "@/lib/campaign-draft";
import { parseCampaignDraftPayload } from "@/lib/campaign-draft";
import { DsChoiceCard } from "@/design-system/components/DsChoiceCard";
import { WizardAccordionSection } from "@/uxpilot-ui/adapters/ux-wizard-primitives";

const SPECIAL_CATEGORIES = [
  "CREDIT",
  "EMPLOYMENT",
  "HOUSING",
  "ISSUES_ELECTIONS_POLITICS"
] as const;

type CampaignSection = "clientAccount" | "identity" | "budget";

type SourceCampaign = { id: string; name: string; objective?: string; status?: string };

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
  const { payload, updatePayload, clients, clientsLoading } = useCampaignDraft();
  const { accounts, accountsLoading, accountsError } = useCampaignStepEffects();
  const [sources, setSources] = useState<SourceCampaign[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<CampaignSection>("clientAccount");

  useEffect(() => {
    if (!payload.copyFromCampaignEnabled || !payload.clientSlug) {
      setSources([]);
      return;
    }
    setSourcesLoading(true);
    fetch(`/api/campaigns/creator-sources?clientId=${encodeURIComponent(payload.clientSlug)}`)
      .then((r) => r.json())
      .then((j: { campaigns?: SourceCampaign[] }) => setSources(j.campaigns ?? []))
      .catch(() => setSources([]))
      .finally(() => setSourcesLoading(false));
  }, [payload.copyFromCampaignEnabled, payload.clientSlug]);

  async function applySnapshot(campaignId: string) {
    if (campaignId.startsWith("draft:")) return;
    setCopyError(null);
    try {
      const res = await fetch(
        `/api/campaigns/${encodeURIComponent(campaignId)}/creator-snapshot`
      );
      const j = (await res.json()) as { ok?: boolean; patch?: Partial<CampaignDraftPayload>; error?: string };
      if (!j.ok || !j.patch) throw new Error("copyFailed");
      const merged = parseCampaignDraftPayload({
        ...payload,
        ...j.patch,
        copyFromCampaignEnabled: true,
        copyFromCampaignId: campaignId
      });
      updatePayload(merged);
    } catch (e) {
      setCopyError(e instanceof Error ? e.message : "copyFailed");
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 space-y-3 bg-[var(--surface-bg)]">
        <div>
          <h2 className="font-heading text-base font-semibold text-[var(--text-main)]">{t("treeCampaign")}</h2>
          <p className="mt-1 hidden text-xs text-[var(--text-dim)] sm:block">{t("campaignStepHint")}</p>
        </div>

        <div className="grid grid-cols-3 gap-2 lg:hidden">
          <DsChoiceCard
            compact
            title={t("campaignSub_client")}
            icon={<Building2 size={16} />}
            accent={activeSection === "clientAccount"}
            onClick={() => setActiveSection("clientAccount")}
          />
          <DsChoiceCard
            compact
            title={t("campaignSub_basics")}
            icon={<Tag size={16} />}
            accent={activeSection === "identity"}
            onClick={() => setActiveSection("identity")}
          />
          <DsChoiceCard
            compact
            title={t("campaignSub_budget")}
            icon={<Wallet size={16} />}
            accent={activeSection === "budget"}
            onClick={() => setActiveSection("budget")}
          />
        </div>

        <div className="hidden gap-4 sm:grid-cols-3 lg:grid">
          <DsChoiceCard
            title={`${t("campaignSub_client")} + ${t("campaignSub_account")}`}
            description={t("campaignSection_clientAccount_hint")}
            icon={<Building2 size={18} />}
            accent={activeSection === "clientAccount"}
            onClick={() => setActiveSection("clientAccount")}
            className="h-full"
          />
          <DsChoiceCard
            title={t("campaignSub_basics")}
            description={t("campaignSection_identity_hint")}
            icon={<Tag size={18} />}
            accent={activeSection === "identity"}
            onClick={() => setActiveSection("identity")}
            className="h-full"
          />
          <DsChoiceCard
            title={t("campaignSub_budget")}
            description={t("campaignSection_budget_hint")}
            icon={<Wallet size={18} />}
            accent={activeSection === "budget"}
            onClick={() => setActiveSection("budget")}
            className="h-full"
          />
        </div>
      </div>

      <div className="campaign-creator-main-scroll min-h-0 flex-1 overflow-y-auto pt-4 pb-2">
        <div className="campaign-creator-main-scroll__inner space-y-3">

      {activeSection === "clientAccount" ? (
        <div className="space-y-3">
          <WizardAccordionSection title={t("campaignSub_client")} defaultOpen>
            <FormField label={tAds("clientLabel")}>
              {clientsLoading ? (
                <div aria-busy="true" aria-label={t("loading")}>
                  <FormFieldSkeleton />
                </div>
              ) : (
                <FormSelect
                  value={payload.clientSlug}
                  onChange={(clientId) =>
                    updatePayload({
                      clientSlug: clientId,
                      adAccountId: "",
                      copyFromCampaignEnabled: false,
                      copyFromCampaignId: null
                    })
                  }
                  placeholder={tAds("selectClient")}
                  options={clients.map((c) => ({ value: c.id, label: c.name }))}
                />
              )}
            </FormField>
          </WizardAccordionSection>

          <WizardAccordionSection title={t("campaignSub_account")}>
            <FormField label={tAds("adAccount")}>
              {!payload.clientSlug ? (
                <FormSelect
                  value=""
                  onChange={() => {}}
                  disabled
                  placeholder={tAds("selectClient")}
                  options={[]}
                />
              ) : accountsLoading ? (
                <div aria-busy="true" aria-label={t("loading")}>
                  <FormFieldSkeleton />
                </div>
              ) : (
                <FormSelect
                  value={payload.adAccountId}
                  onChange={(adAccountId) => updatePayload({ adAccountId })}
                  placeholder={tAds("adAccountRequired")}
                  options={accounts.map((a) => ({ value: a.metaAdAccountId, label: a.label }))}
                />
              )}
              {accountsError ? (
                <p className="mt-1 text-xs text-red-600">
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
                <p className="mt-1 text-xs text-[var(--text-dim)]">
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
            </FormField>
          </WizardAccordionSection>

          <WizardAccordionSection title={t("copyCampaignTitle")} hint={t("copyCampaignHint")}>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={!payload.copyFromCampaignEnabled}
                  onChange={() =>
                    updatePayload({ copyFromCampaignEnabled: false, copyFromCampaignId: null })
                  }
                  className="accent-[var(--ui-accent)]"
                />
                {t("copyCampaignNo")}
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={payload.copyFromCampaignEnabled}
                  onChange={() => updatePayload({ copyFromCampaignEnabled: true })}
                  className="accent-[var(--ui-accent)]"
                />
                {t("copyCampaignYes")}
              </label>
            </div>
            {payload.copyFromCampaignEnabled ? (
              !payload.clientSlug ? (
                <p className="text-xs text-[var(--text-dim)]">{t("selectClientFirst")}</p>
              ) : sourcesLoading ? (
                <div aria-busy="true" aria-label={t("loading")}>
                  <FormFieldSkeleton />
                </div>
              ) : (
                <FormSelect
                  value={payload.copyFromCampaignId ?? ""}
                  onChange={(id) => {
                    const nextId = id || null;
                    updatePayload({ copyFromCampaignId: nextId });
                    if (nextId && !nextId.startsWith("draft:")) void applySnapshot(nextId);
                  }}
                  placeholder={t("copyCampaignSelect")}
                  options={sources.map((c) => ({ value: c.id, label: c.name }))}
                />
              )
            ) : null}
            {copyError ? (
              <p className="text-xs text-red-600">
                {copyError === "copyFailed" ? t("copyFailed") : copyError}
              </p>
            ) : null}
          </WizardAccordionSection>
        </div>
      ) : null}

      {activeSection === "identity" ? (
        <WizardAccordionSection title={t("campaignSub_basics")} defaultOpen>
          <FormField label={t("campaignName")}>
            <input
              value={payload.campaign.name}
              onChange={(e) =>
                updatePayload((p) => ({
                  ...p,
                  campaign: { ...p.campaign, name: e.target.value }
                }))
              }
              className="ui-input"
            />
          </FormField>
          <FormField label={t("objective")}>
            <input
              value={t(`objective_${payload.objective}`)}
              readOnly
              className="ui-input bg-[var(--surface-bg)]"
            />
          </FormField>
        </WizardAccordionSection>
      ) : null}

      {activeSection === "budget" ? (
        <WizardAccordionSection title={t("campaignSub_budget")} defaultOpen>
          <p className="text-xs text-[var(--text-dim)]">{t("budgetSection")}</p>
          <div className="space-y-2">
            <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-[var(--border-color)] p-3 transition hover:border-[var(--ui-accent-border)]">
              <input
                type="radio"
                name="budgetLevel"
                checked={payload.campaign.budgetLevel === "campaign"}
                onChange={() =>
                  updatePayload((p) => ({
                    ...p,
                    campaign: { ...p.campaign, budgetLevel: "campaign" }
                  }))
                }
                className="mt-1 accent-[var(--ui-accent)]"
              />
              <div>
                <p className="text-sm font-medium text-[var(--text-main)]">{t("budgetCbo")}</p>
                <p className="text-[11px] text-[var(--text-dim)]">{t("budgetCboHint")}</p>
              </div>
            </label>
            <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-[var(--border-color)] p-3 transition hover:border-[var(--ui-accent-border)]">
              <input
                type="radio"
                name="budgetLevel"
                checked={payload.campaign.budgetLevel === "adset"}
                onChange={() =>
                  updatePayload((p) => ({
                    ...p,
                    campaign: { ...p.campaign, budgetLevel: "adset" }
                  }))
                }
                className="mt-1 accent-[var(--ui-accent)]"
              />
              <div>
                <p className="text-sm font-medium text-[var(--text-main)]">{t("budgetAbo")}</p>
                <p className="text-[11px] text-[var(--text-dim)]">{t("budgetAboHint")}</p>
              </div>
            </label>
          </div>
          <FormField label={tAds("dailyBudget")}>
            <input
              type="number"
              min={1}
              value={payload.campaign.dailyBudgetBRL}
              onChange={(e) =>
                updatePayload((p) => ({
                  ...p,
                  campaign: { ...p.campaign, dailyBudgetBRL: Number(e.target.value) || 0 }
                }))
              }
              className="ui-input"
            />
          </FormField>

          <div className="space-y-3">
            <h4 className="font-heading text-xs font-semibold text-[var(--text-main)]">{t("specialCategories")}</h4>
            <p className="text-[11px] text-[var(--text-dim)]">{t("specialCategoriesHint")}</p>
            <div className="flex flex-wrap gap-2">
              {SPECIAL_CATEGORIES.map((cat) => {
                const checked = payload.campaign.specialAdCategories.includes(cat);
                return (
                  <label
                    key={cat}
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--border-color)] px-2 py-1 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
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
                      className="accent-[var(--ui-accent)]"
                    />
                    {t(`specialCat_${cat}`)}
                  </label>
                );
              })}
            </div>
          </div>
        </WizardAccordionSection>
      ) : null}
        </div>
      </div>
    </div>
  );
}
