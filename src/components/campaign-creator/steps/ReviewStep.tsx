"use client";

import { useTranslations } from "next-intl";

import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";

export function ReviewStep() {
  const t = useTranslations("campaignCreator");
  const { payload } = useCampaignDraft();

  const rows = [
    { label: t("campaignName"), value: payload.campaign.name },
    { label: t("objective"), value: t(`objective_${payload.objective}`) },
    {
      label: t("budgetSection"),
      value: `R$ ${payload.campaign.dailyBudgetBRL.toFixed(2)} (${payload.campaign.budgetLevel === "campaign" ? "CBO" : "ABO"})`
    },
    { label: t("adsetName"), value: payload.adset.name },
    {
      label: t("audienceSummary"),
      value: `${payload.adset.targeting.locations.length} loc · ${payload.adset.targeting.ageMin}-${payload.adset.targeting.ageMax}`
    },
    { label: t("adName"), value: payload.ad.name },
    { label: t("mediaSummary"), value: String(payload.ad.imageHashes.length) },
    {
      label: t("destinationSection"),
      value:
        payload.ad.destinationType === "instant_form"
          ? t("destInstantForm")
          : payload.ad.linkUrl || "—"
    }
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">{t("reviewHint")}</p>
      <div className="ui-card divide-y divide-slate-100">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm">
            <span className="text-slate-500">{r.label}</span>
            <span className="max-w-[60%] text-right font-medium text-slate-900">{r.value}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500">{t("publishPausedNote")}</p>
    </div>
  );
}
