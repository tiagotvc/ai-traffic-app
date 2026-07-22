"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { TableSkeleton } from "@/components/ui/Skeleton";
import { GoogleDateRangePicker } from "@/components/GoogleDateRangePicker";
import { useGoogleDateRange } from "@/components/google/useGoogleDateRange";

type ActionType = "NEGATIVAR" | "ADICIONAR_KEYWORD" | "PAUSAR" | "REDUZIR_LANCE" | "AUMENTAR_LANCE";

type RecRow = {
  id: string;
  actionType: ActionType;
  campaignName: string | null;
  adGroupName: string | null;
  keywordText: string;
  matchType: string | null;
  score: string;
  confidence: string;
  ruleJustification: string | null;
  autoApplyEligible: boolean;
  source: string | null;
};

const ACTION_STYLE: Record<ActionType, string> = {
  NEGATIVAR: "bg-amber-500/15 text-amber-400",
  ADICIONAR_KEYWORD: "bg-emerald-500/15 text-emerald-400",
  PAUSAR: "bg-rose-500/15 text-rose-400",
  REDUZIR_LANCE: "bg-sky-500/15 text-sky-400",
  AUMENTAR_LANCE: "bg-violet-500/15 text-violet-400"
};

function priority(r: RecRow): number {
  return (Number(r.score) || 0) * (Number(r.confidence) || 0);
}

export function ClientGoogleRecommendations({
  clientId,
  scope
}: {
  clientId: string;
  /** Quando fornecido, filtra a fila pelo grupo/campanha (uso no drill). */
  scope?: { campaignId?: string; adGroupId?: string };
}) {
  const t = useTranslations("client");
  const base = `/api/clients/${encodeURIComponent(clientId)}/google-ads`;

  const [range, setRange] = useGoogleDateRange(clientId);
  const [rows, setRows] = useState<RecRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recomputing, setRecomputing] = useState(false);

  const loadQueue = useCallback(() => {
    setError(null);
    setRows(null);
    const p = new URLSearchParams({ status: "PENDING" });
    if (scope?.campaignId) p.set("campaignId", scope.campaignId);
    if (scope?.adGroupId) p.set("adGroupId", scope.adGroupId);
    fetch(`${base}/recommendations?${p}`)
      .then((r) => r.json())
      .then((j) => (j.ok ? setRows(j.rows ?? []) : setError(j.error ?? "error")))
      .catch(() => setError("error"));
  }, [base, scope?.campaignId, scope?.adGroupId]);

  useEffect(() => void loadQueue(), [loadQueue]);

  const recompute = useCallback(() => {
    setRecomputing(true);
    setError(null);
    const p = new URLSearchParams({ since: range.since, until: range.until });
    fetch(`${base}/recommendations?${p}`, { method: "POST" })
      .then((r) => r.json())
      .then((j) => (j.ok ? loadQueue() : setError(j.error ?? "error")))
      .catch(() => setError("error"))
      .finally(() => setRecomputing(false));
  }, [base, range, loadQueue]);

  const sorted = rows ? [...rows].sort((a, b) => priority(b) - priority(a)) : null;

  return (
    <div className="ui-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-[var(--text-main)]">{t("googleRecsTitle")}</h3>
          {sorted && sorted.length > 0 ? (
            <span className="text-xs text-[var(--text-dimmer)]">
              {t("googleRecsCount", { count: sorted.length })}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <GoogleDateRangePicker value={range} onChange={setRange} />
          <button
            type="button"
            onClick={recompute}
            disabled={recomputing}
            className="rounded-full border border-[var(--border-color)] px-3 py-1 text-xs font-medium text-[var(--text-dim)] transition hover:text-[var(--text-main)] disabled:opacity-50"
          >
            {recomputing ? t("googleRecsRecomputing") : t("googleRecsRecompute")}
          </button>
        </div>
      </div>

      <p className="mt-1 text-xs text-[var(--text-dimmer)]">{t("googleRecsHint")}</p>

      <div className="mt-3 overflow-x-auto">
        {rows === null && !error ? (
          <TableSkeleton />
        ) : error ? (
          <div className="text-xs text-[var(--text-dim)]">
            {error === "not_linked" ? t("googleAdsNotLinked") : t("googleAdsLoadError")}
          </div>
        ) : !sorted || sorted.length === 0 ? (
          <div className="text-xs text-[var(--text-dim)]">{t("googleRecsEmpty")}</div>
        ) : (
          <table className="w-full min-w-[720px] text-xs">
            <thead>
              <tr className="text-left text-[var(--text-dimmer)]">
                <th className="py-2 pr-3 font-medium">{t("googleRecsColAction")}</th>
                <th className="py-2 pr-3 font-medium">{t("googleRecsColTerm")}</th>
                <th className="py-2 pr-3 font-medium">{t("googleColAdGroup")}</th>
                <th className="py-2 pr-3 text-right font-medium">{t("googleRecsColScore")}</th>
                <th className="py-2 pr-3 font-medium">{t("googleRecsColWhy")}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.id} className="border-t border-[var(--border-color)] align-top">
                  <td className="py-2 pr-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 font-medium ${ACTION_STYLE[r.actionType]}`}>
                      {t(`googleRecAction_${r.actionType}`)}
                    </span>
                    {r.source === "ai_refined" ? (
                      <span className="ml-1.5 rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-400">
                        {t("googleRecsAi")}
                      </span>
                    ) : null}
                    {r.autoApplyEligible ? (
                      <span className="ml-1.5 text-[10px] uppercase tracking-wide text-[var(--text-dimmer)]">
                        {t("googleRecsAuto")}
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-3 font-medium text-[var(--text-main)]">
                    {r.keywordText}
                    {r.matchType ? (
                      <span className="ml-1 text-[var(--text-dimmer)]">· {r.matchType}</span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-3 text-[var(--text-dimmer)]">{r.adGroupName || "—"}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-[var(--text-dim)]">
                    {Math.round(priority(r) * 100)}%
                  </td>
                  <td className="py-2 pr-3 text-[var(--text-dim)]">{r.ruleJustification || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
