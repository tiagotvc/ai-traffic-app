"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Info, X } from "lucide-react";

import { TableSkeleton } from "@/components/ui/Skeleton";
import { GoogleDateRangePicker, type DateRange } from "@/components/GoogleDateRangePicker";
import { useGoogleDateRange } from "@/components/google/useGoogleDateRange";
import { useGoogleActionFeedback } from "@/components/google/GoogleRowActions";
import { matchTypeLabel } from "@/components/google/googleMatchType";
import { GoogleRecBadge } from "@/components/google/googleRecBadge";

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

function priority(r: RecRow): number {
  return (Number(r.score) || 0) * (Number(r.confidence) || 0);
}

export function ClientGoogleRecommendations({
  clientId,
  scope,
  range: propRange
}: {
  clientId: string;
  /** Quando fornecido, filtra a fila pelo grupo/campanha (uso no drill). */
  scope?: { campaignId?: string; adGroupId?: string };
  /** Quando fornecido, o intervalo é controlado externamente (filtro global da página). */
  range?: DateRange;
}) {
  const t = useTranslations("client");
  const locale = useLocale();
  const base = `/api/clients/${encodeURIComponent(clientId)}/google-ads`;
  const { node: feedback, notify } = useGoogleActionFeedback();

  const [ownRange, setOwnRange] = useGoogleDateRange(clientId);
  const range = propRange ?? ownRange;
  const [rows, setRows] = useState<RecRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recomputing, setRecomputing] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "ADICIONAR_KEYWORD" | "NEGATIVAR">("all");

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
      .then((j) => {
        if (j.ok) {
          loadQueue();
          // Avisa os badges inline dos termos (ClientGoogleKeywords) que a fila mudou.
          window.dispatchEvent(new Event("google-recs-updated"));
        } else {
          setError(j.error ?? "error");
        }
      })
      .catch(() => setError("error"))
      .finally(() => setRecomputing(false));
  }, [base, range, loadQueue]);

  // Recalcula automaticamente quando o filtro de data muda (recs seguem o período da página).
  const lastRangeRef = useRef<string>("");
  useEffect(() => {
    const key = `${range.since}|${range.until}`;
    if (!range.since || !range.until) return;
    if (lastRangeRef.current === "") {
      // Primeira montagem: só registra o período; mostra a fila já persistida.
      lastRangeRef.current = key;
      return;
    }
    if (lastRangeRef.current === key) return;
    lastRangeRef.current = key;
    const id = setTimeout(() => recompute(), 800);
    return () => clearTimeout(id);
  }, [range.since, range.until, recompute]);

  async function decide(id: string, action: "accept" | "reject") {
    setPendingId(id);
    try {
      const res = await fetch(`${base}/recommendations/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action })
      });
      const j = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; message?: string } | null;
      if (res.ok && j?.ok) {
        notify(action === "accept" ? t("googleRecAccepted") : t("googleRecRejected"), "success");
        loadQueue();
      } else if (j?.error === "write_blocked") {
        notify(t("googleWriteBlocked"), "error");
      } else if (j?.error === "not_connected") {
        notify(t("googleReconnect"), "error");
      } else {
        notify(j?.message || t("googleActionFail"), "error");
      }
    } finally {
      setPendingId(null);
    }
  }

  const sorted = rows ? [...rows].sort((a, b) => priority(b) - priority(a)) : null;
  const visible = sorted ? sorted.filter((r) => filter === "all" || r.actionType === filter) : null;
  const counts = {
    all: sorted?.length ?? 0,
    ADICIONAR_KEYWORD: sorted?.filter((r) => r.actionType === "ADICIONAR_KEYWORD").length ?? 0,
    NEGATIVAR: sorted?.filter((r) => r.actionType === "NEGATIVAR").length ?? 0
  };
  const FILTERS: Array<{ key: typeof filter; label: string; n: number }> = [
    { key: "all", label: t("googleRecsFilterAll"), n: counts.all },
    { key: "ADICIONAR_KEYWORD", label: t("googleRecsFilterKeywords"), n: counts.ADICIONAR_KEYWORD },
    { key: "NEGATIVAR", label: t("googleRecsFilterNegatives"), n: counts.NEGATIVAR }
  ];

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
          {propRange ? null : <GoogleDateRangePicker value={range} onChange={setOwnRange} />}
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

      {feedback ? <div className="mt-3">{feedback}</div> : null}

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
          <>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    filter === f.key
                      ? "border-transparent bg-[var(--ui-accent)] text-white"
                      : "border-[var(--border-color)] text-[var(--text-dim)]"
                  }`}
                >
                  {f.label} ({f.n})
                </button>
              ))}
            </div>
            {!visible || visible.length === 0 ? (
              <div className="text-xs text-[var(--text-dim)]">{t("googleRecsFilterEmpty")}</div>
            ) : (
          <table className="w-full min-w-[720px] text-xs">
            <thead>
              <tr className="text-left text-[var(--text-dimmer)]">
                <th className="py-2 pr-3 font-medium">{t("googleRecsColDecide")}</th>
                <th className="py-2 pr-3 font-medium">{t("googleRecsColAction")}</th>
                <th className="py-2 pr-3 font-medium">{t("googleRecsColTerm")}</th>
                <th className="py-2 pr-3 font-medium">{t("googleColAdGroup")}</th>
                <th className="py-2 pr-3 text-right font-medium">{t("googleRecsColScore")}</th>
                <th className="py-2 pr-3 font-medium">{t("googleRecsColWhy")}</th>
              </tr>
            </thead>
            <tbody>
              {(visible ?? []).map((r) => (
                <tr key={r.id} className="border-t border-[var(--border-color)] align-top">
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={pendingId === r.id}
                        onClick={() => decide(r.id, "accept")}
                        title={t("googleRecAccept")}
                        aria-label={t("googleRecAccept")}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[var(--border-color)] text-[var(--text-dim)] transition hover:border-emerald-500/40 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Check size={13} />
                      </button>
                      <button
                        type="button"
                        disabled={pendingId === r.id}
                        onClick={() => decide(r.id, "reject")}
                        title={t("googleRecReject")}
                        aria-label={t("googleRecReject")}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[var(--border-color)] text-[var(--text-dim)] transition hover:border-rose-500/40 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </td>
                  <td className="py-2 pr-3">
                    <GoogleRecBadge actionType={r.actionType} />
                    {r.source === "ai_refined" ? (
                      <span className="ml-1.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
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
                      <span className="ml-1 text-[var(--text-dimmer)]">
                        · {matchTypeLabel(r.matchType, locale)}
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-3 text-[var(--text-dimmer)]">{r.adGroupName || "—"}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-[var(--text-dim)]">
                    {Math.round(priority(r) * 100)}%
                  </td>
                  <td className="py-2 pr-3 text-[var(--text-dim)]">
                    <span className="inline-flex items-start gap-1.5">
                      <span>{r.ruleJustification || "—"}</span>
                      <span
                        className="mt-0.5 shrink-0 cursor-help text-[var(--text-dimmer)] transition-colors hover:text-[var(--ui-accent)]"
                        title={t(`googleRecExplain_${r.actionType}`)}
                      >
                        <Info size={13} aria-hidden />
                      </span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
            )}
          </>
        )}
      </div>
    </div>
  );
}
