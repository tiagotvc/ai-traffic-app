"use client";

import { useTranslations } from "next-intl";

import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";
import { countPublishEntities, resolveAdTargetAdsets } from "@/lib/campaign-draft";

export function ReviewStep() {
  const t = useTranslations("campaignCreator");
  const { payload } = useCampaignDraft();
  const counts = countPublishEntities(payload);

  const rows = [
    { label: t("campaignName"), value: payload.campaign.name },
    { label: t("objective"), value: t(`objective_${payload.objective}`) },
    {
      label: t("buyingType"),
      value:
        payload.buyingType === "reservation" ? t("buyingReservation") : t("buyingAuction")
    },
    {
      label: t("budgetSection"),
      value: `R$ ${payload.campaign.dailyBudgetBRL.toFixed(2)} (${payload.campaign.budgetLevel === "campaign" ? "CBO" : "ABO"})`
    },
    { label: t("reviewAdsetCount"), value: String(counts.adsets) },
    { label: t("reviewAdCount"), value: String(payload.ads.length) },
    {
      label: t("reviewMetaEntities"),
      value: t("reviewMetaTotal", {
        adsets: counts.adsets,
        ads: counts.ads
      })
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

      <div className="ui-card overflow-x-auto p-4">
        <h3 className="text-sm font-semibold text-slate-900">{t("reviewMatrixTitle")}</h3>
        <p className="mt-1 text-[11px] text-slate-500">{t("reviewMatrixHint")}</p>
        <table className="mt-3 w-full min-w-[320px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2 pr-2">{t("treeAdset")}</th>
              {payload.ads.map((ad) => (
                <th key={ad.id} className="px-2 py-2 text-center">
                  {ad.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payload.adsets.map((adset) => (
              <tr key={adset.id} className="border-b border-slate-100">
                <td className="py-2 pr-2 font-medium text-slate-800">{adset.name}</td>
                {payload.ads.map((ad) => {
                  const targets = resolveAdTargetAdsets(payload, ad);
                  const willPublish = targets.some((a) => a.id === adset.id);
                  return (
                    <td key={ad.id} className="px-2 py-2 text-center">
                      {willPublish ? (
                        <span className="text-violet-600" title={t("reviewWillPublish")}>
                          ✓
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500">{t("publishPausedNote")}</p>
    </div>
  );
}
