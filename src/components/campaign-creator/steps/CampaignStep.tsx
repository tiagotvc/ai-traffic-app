"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";
import { FormField } from "@/components/ui/FormField";
import { useClientPublishDefaults } from "@/hooks/useClientPublishDefaults";
import { usePublishAssets } from "@/hooks/usePublishAssets";
import type { CampaignDraftPayload } from "@/lib/campaign-draft";
import { getActiveAdset, parseCampaignDraftPayload } from "@/lib/campaign-draft";

const SPECIAL_CATEGORIES = [
  "CREDIT",
  "EMPLOYMENT",
  "HOUSING",
  "ISSUES_ELECTIONS_POLITICS"
] as const;

type SourceCampaign = { id: string; name: string; objective?: string; status?: string };

export function CampaignStep() {
  const t = useTranslations("campaignCreator");
  const tAds = useTranslations("ads");
  const locale = useLocale();
  const { payload, updatePayload, clients } = useCampaignDraft();
  const { accounts, accountsLoading, defaultAdAccountId } = usePublishAssets(
    payload.clientSlug,
    payload.adAccountId
  );
  const { defaultTargeting } = useClientPublishDefaults(payload.clientSlug, locale);
  const [sources, setSources] = useState<SourceCampaign[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  useEffect(() => {
    if (!payload.adAccountId && defaultAdAccountId) {
      updatePayload({ adAccountId: defaultAdAccountId });
    }
  }, [defaultAdAccountId, payload.adAccountId, updatePayload]);

  useEffect(() => {
    const adset = getActiveAdset(payload);
    if (defaultTargeting && !adset.targeting.locations.length) {
      updatePayload((p) => {
        const activeId = p.activeAdsetId ?? p.adsets[0]?.id;
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
    }
  }, [defaultTargeting, payload, updatePayload]);

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
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </FormField>

      <div className="ui-card space-y-3 p-4">
        <h3 className="text-sm font-semibold text-slate-900">{t("copyCampaignTitle")}</h3>
        <p className="text-[11px] text-slate-500">{t("copyCampaignHint")}</p>
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
            <p className="text-xs text-slate-400">{t("loading")}</p>
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
          {accountsLoading ? (
            <div className="ui-input text-slate-400">{t("loading")}</div>
          ) : (
            <select
              value={payload.adAccountId}
              onChange={(e) => updatePayload({ adAccountId: e.target.value })}
              className="ui-select"
              disabled={!payload.clientSlug}
            >
              <option value="">{tAds("selectClient")}</option>
              {accounts.map((a) => (
                <option key={a.metaAdAccountId} value={a.metaAdAccountId}>
                  {a.label}
                </option>
              ))}
            </select>
          )}
        </FormField>

        <FormField label={t("objective")}>
          <input
            value={t(`objective_${payload.objective}`)}
            readOnly
            className="ui-input bg-slate-50"
          />
        </FormField>
      </div>

      <div className="ui-card space-y-3 p-4">
        <h3 className="text-sm font-semibold text-slate-900">{t("budgetSection")}</h3>
        <div className="space-y-2">
          <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-slate-200 p-3">
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
              <p className="text-sm font-medium text-slate-900">{t("budgetCbo")}</p>
              <p className="text-[11px] text-slate-500">{t("budgetCboHint")}</p>
            </div>
          </label>
          <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-slate-200 p-3">
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
              <p className="text-sm font-medium text-slate-900">{t("budgetAbo")}</p>
              <p className="text-[11px] text-slate-500">{t("budgetAboHint")}</p>
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
        <h3 className="text-sm font-semibold text-slate-900">{t("specialCategories")}</h3>
        <p className="text-[11px] text-slate-500">{t("specialCategoriesHint")}</p>
        <div className="flex flex-wrap gap-2">
          {SPECIAL_CATEGORIES.map((cat) => {
            const checked = payload.campaign.specialAdCategories.includes(cat);
            return (
              <label
                key={cat}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1 text-xs"
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

      <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
        <span className="text-sm text-slate-700">{t("abTest")}</span>
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
