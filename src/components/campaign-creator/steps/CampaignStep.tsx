"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";
import { FormField } from "@/components/ui/FormField";
import { useClientPublishDefaults } from "@/hooks/useClientPublishDefaults";
import { usePublishAssets, type PublishAccountsError } from "@/hooks/usePublishAssets";
import type { CampaignDraftPayload } from "@/lib/campaign-draft";
import { parseCampaignDraftPayload } from "@/lib/campaign-draft";

const SPECIAL_CATEGORIES = [
  "CREDIT",
  "EMPLOYMENT",
  "HOUSING",
  "ISSUES_ELECTIONS_POLITICS"
] as const;

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

export function CampaignStep() {
  const t = useTranslations("campaignCreator");
  const tAds = useTranslations("ads");
  const locale = useLocale();
  const { payload, updatePayload, clients } = useCampaignDraft();
  const { accounts, accountsLoading, defaultAdAccountId, accountsError } = usePublishAssets(
    payload.clientSlug,
    payload.adAccountId
  );
  const { defaultTargeting } = useClientPublishDefaults(payload.clientSlug, locale);
  const [sources, setSources] = useState<SourceCampaign[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

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
      if (!j.ok || !j.patch) throw new Error(j.error ?? "copyFailed");
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
    <div className="space-y-4">
      <FormField label={tAds("clientLabel")}>
        <select
          value={payload.clientSlug}
          onChange={(e) =>
            updatePayload({
              clientSlug: e.target.value,
              adAccountId: "",
              copyFromCampaignEnabled: false,
              copyFromCampaignId: null
            })
          }
          className="ui-select"
        >
          <option value="">{tAds("selectClient")}</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </FormField>

      <div className="ui-card space-y-3 p-4">
        <h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">{t("copyCampaignTitle")}</h3>
        <p className="text-[11px] text-[var(--text-dim)]">{t("copyCampaignHint")}</p>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={!payload.copyFromCampaignEnabled}
              onChange={() =>
                updatePayload({ copyFromCampaignEnabled: false, copyFromCampaignId: null })
              }
              className="accent-violet-600"
            />
            {t("copyCampaignNo")}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={payload.copyFromCampaignEnabled}
              onChange={() => updatePayload({ copyFromCampaignEnabled: true })}
              className="accent-violet-600"
            />
            {t("copyCampaignYes")}
          </label>
        </div>
        {payload.copyFromCampaignEnabled ? (
          !payload.clientSlug ? (
            <p className="text-xs text-amber-700">{t("selectClientFirst")}</p>
          ) : sourcesLoading ? (
            <p className="text-xs text-[var(--text-dimmer)]">{t("loading")}</p>
          ) : (
            <select
              value={payload.copyFromCampaignId ?? ""}
              onChange={(e) => {
                const id = e.target.value || null;
                updatePayload({ copyFromCampaignId: id });
                if (id && !id.startsWith("draft:")) void applySnapshot(id);
              }}
              className="ui-select text-sm"
            >
              <option value="">{t("copyCampaignSelect")}</option>
              {sources.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )
        ) : null}
        {copyError ? <p className="text-xs text-red-600">{copyError}</p> : null}
      </div>

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

      <div className="grid gap-4 md:grid-cols-2">
        <FormField label={tAds("adAccount")}>
          {!payload.clientSlug ? (
            <select className="ui-select" disabled>
              <option value="">{tAds("selectClient")}</option>
            </select>
          ) : accountsLoading ? (
            <div className="ui-input text-[var(--text-dimmer)]">{t("loading")}</div>
          ) : (
            <select
              value={payload.adAccountId}
              onChange={(e) => updatePayload({ adAccountId: e.target.value })}
              className="ui-select"
            >
              <option value="">{tAds("adAccountRequired")}</option>
              {accounts.map((a) => (
                <option key={a.metaAdAccountId} value={a.metaAdAccountId}>
                  {a.label}
                </option>
              ))}
            </select>
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
            <p className="mt-1 text-xs text-amber-700">
              {tAds("adAccountsEmpty")}{" "}
              <a href="/settings/integrations" className="font-semibold underline">
                {tAds("adAccountsSettingsLink")}
              </a>
              {" · "}
              <a
                href={`/clients/${encodeURIComponent(payload.clientSlug)}/settings`}
                className="font-semibold underline"
              >
                {tAds("adAccountsClientLink")}
              </a>
            </p>
          ) : null}
        </FormField>

        <FormField label={t("objective")}>
          <input
            value={t(`objective_${payload.objective}`)}
            readOnly
            className="ui-input bg-[var(--surface-bg)]"
          />
        </FormField>
      </div>

      <div className="ui-card space-y-3 p-4">
        <h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">{t("budgetSection")}</h3>
        <div className="space-y-2">
          <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-[var(--border-color)] p-3">
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
              className="mt-1 accent-violet-600"
            />
            <div>
              <p className="text-sm font-medium text-[var(--text-main)]">{t("budgetCbo")}</p>
              <p className="text-[11px] text-[var(--text-dim)]">{t("budgetCboHint")}</p>
            </div>
          </label>
          <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-[var(--border-color)] p-3">
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
              className="mt-1 accent-violet-600"
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
      </div>

      <div className="ui-card space-y-3 p-4">
        <h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">{t("specialCategories")}</h3>
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
                  className="accent-violet-600"
                />
                {t(`specialCat_${cat}`)}
              </label>
            );
          })}
        </div>
      </div>

      <label className="flex items-center justify-between rounded-xl border border-[var(--border-color)] p-3">
        <span className="text-sm text-[var(--text-dim)]">{t("abTest")}</span>
        <input
          type="checkbox"
          checked={payload.campaign.abTestEnabled}
          onChange={(e) =>
            updatePayload((p) => ({
              ...p,
              campaign: { ...p.campaign, abTestEnabled: e.target.checked }
            }))
          }
          className="accent-violet-600"
        />
      </label>
    </div>
  );
}
