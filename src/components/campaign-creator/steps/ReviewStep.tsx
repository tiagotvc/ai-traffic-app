"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Sparkles } from "lucide-react";

import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";
import { countPublishEntities, resolveAdTargetAdsets } from "@/lib/campaign-draft";

export function ReviewStep() {
  const t = useTranslations("campaignCreator");
  const tAi = useTranslations("campaignCreator.ai");
  const { payload, setActiveNode } = useCampaignDraft();
  const counts = countPublishEntities(payload);
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);

  const isAiDraft = payload.meta?.creationMode === "ai";
  const rationale = payload.meta?.aiRationale;

  async function regenerateWithAi() {
    if (!payload.clientSlug || !payload.adAccountId) return;
    setRegenerating(true);
    setRegenError(null);
    try {
      const res = await fetch("/api/campaign-creator/ai-generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId: payload.clientSlug,
          adAccountId: payload.adAccountId,
          locale: document.documentElement.lang || "pt-BR"
        })
      });
      const j = (await res.json()) as { ok?: boolean; draftId?: string; error?: string; message?: string };
      if (!j.ok || !j.draftId) {
        throw new Error(j.message ?? j.error ?? tAi("generateFailed"));
      }
      window.location.href = `/campaigns/new/${j.draftId}?review=1`;
    } catch (e) {
      setRegenError(e instanceof Error ? e.message : tAi("generateFailed"));
    } finally {
      setRegenerating(false);
    }
  }

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
      {isAiDraft && rationale ? (
        <div className="ui-card border border-amber-200/80 bg-gradient-to-br from-amber-50/60 to-white p-4">
          <div className="flex items-start gap-2">
            <Sparkles size={18} className="mt-0.5 shrink-0 text-amber-700" />
            <div className="min-w-0 flex-1">
              <h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">
                {tAi("reviewRationaleTitle")}
              </h3>
              <p className="mt-1 text-sm text-[var(--text-main)]">{rationale.summary}</p>
              {payload.meta?.aiStrategy ? (
                <p className="mt-2 text-xs text-[var(--text-dim)]">
                  {tAi("reviewStrategy")}: {tAi(`strategy_${payload.meta.aiStrategy}`)}
                </p>
              ) : null}
              {payload.meta?.referenceCampaignId ? (
                <p className="mt-1 text-xs text-[var(--text-dim)]">
                  {tAi("reviewReference")}: {payload.meta.referenceCampaignId}
                </p>
              ) : null}
              <div className="mt-3 space-y-2 text-xs text-[var(--text-dim)]">
                <p>
                  <span className="font-medium text-[var(--text-main)]">{tAi("reviewAudience")}:</span>{" "}
                  {rationale.audienceReason}
                </p>
                <p>
                  <span className="font-medium text-[var(--text-main)]">{tAi("reviewCopy")}:</span>{" "}
                  {rationale.copyReason}
                </p>
                {rationale.signals.length ? (
                  <ul className="mt-1 list-inside list-disc">
                    {rationale.signals.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
              {payload.meta?.suggestedAudiences?.length ? (
                <div className="mt-3">
                  <p className="text-xs font-medium text-[var(--text-main)]">
                    {tAi("suggestedAudiences")}
                  </p>
                  <ul className="mt-1 space-y-1 text-xs text-[var(--text-dim)]">
                    {payload.meta.suggestedAudiences.map((a) => (
                      <li key={`${a.type}-${a.name}`}>
                        <span className="font-medium">{a.name}</span> ({a.type}) — {a.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="ui-btn-secondary text-xs"
                  onClick={() => setActiveNode("adset")}
                >
                  {tAi("editAdset")}
                </button>
                <button
                  type="button"
                  className="ui-btn-secondary text-xs"
                  onClick={() => setActiveNode("ad")}
                >
                  {tAi("editAd")}
                </button>
                <button
                  type="button"
                  className="ui-btn-secondary text-xs"
                  disabled={regenerating}
                  onClick={() => void regenerateWithAi()}
                >
                  {regenerating ? tAi("regenerating") : tAi("regenerate")}
                </button>
              </div>
              {regenError ? <p className="mt-2 text-xs text-red-600">{regenError}</p> : null}
            </div>
          </div>
        </div>
      ) : null}

      <p className="text-sm text-[var(--text-dim)]">{t("reviewHint")}</p>
      <div className="ui-card divide-y divide-[var(--border-color)]">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm">
            <span className="text-[var(--text-dim)]">{r.label}</span>
            <span className="max-w-[60%] text-right font-medium text-[var(--text-main)]">{r.value}</span>
          </div>
        ))}
      </div>

      <div className="ui-card overflow-x-auto p-4">
        <h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">{t("reviewMatrixTitle")}</h3>
        <p className="mt-1 text-[11px] text-[var(--text-dim)]">{t("reviewMatrixHint")}</p>
        <table className="mt-3 w-full min-w-[320px] text-left text-xs">
          <thead>
            <tr className="border-b border-[var(--border-color)] text-[var(--text-dim)]">
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
              <tr key={adset.id} className="border-b border-[var(--border-color)]">
                <td className="py-2 pr-2 font-medium text-[var(--text-main)]">{adset.name}</td>
                {payload.ads.map((ad) => {
                  const targets = resolveAdTargetAdsets(payload, ad);
                  const willPublish = targets.some((a) => a.id === adset.id);
                  return (
                    <td key={ad.id} className="px-2 py-2 text-center">
                      {willPublish ? (
                        <span className="text-[var(--violet)]" title={t("reviewWillPublish")}>
                          ✓
                        </span>
                      ) : (
                        <span className="text-[var(--text-dimmer)]">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[var(--text-dim)]">{t("publishPausedNote")}</p>
    </div>
  );
}
