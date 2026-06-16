"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState, useTransition } from "react";

type SyncStatus = {
  lastManualSyncAt: string | null;
  lastRun: { finishedAt: string | null; accountsDone?: number; accountsTotal?: number } | null;
  accounts: Array<{ lastSyncedAt: string | null }>;
  manualSyncCooldown?: { retryAfterSec: number } | null;
};

type BackfillStatus = {
  runId: string;
  status: string;
  accountsDone: number;
  accountsTotal: number;
  daysDone: number;
  daysTotal: number;
};

function formatRelative(iso: string | null, locale: string) {
  const pt = locale.startsWith("pt");
  if (!iso) return pt ? "nunca" : "never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return pt ? "agora mesmo" : "just now";
  if (mins < 60) return pt ? `há ${mins} min` : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return pt ? `há ${hrs}h` : `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return pt ? `há ${days}d` : `${days}d ago`;
}

export function SyncRefreshButton({ clientId }: { clientId?: string }) {
  const t = useTranslations("sync");
  const locale = useLocale();
  const [lastIso, setLastIso] = useState<string | null>(null);
  const [cooldownSec, setCooldownSec] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [backfill, setBackfill] = useState<BackfillStatus | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isBackfillPending, startBackfillTransition] = useTransition();
  const [, setTick] = useState(0);

  const loadStatus = useCallback(() => {
    const qs = clientId ? `?clientId=${encodeURIComponent(clientId)}` : "";
    fetch(`/api/sync/status${qs}`)
      .then((r) => r.json())
      .then((j: SyncStatus & { ok?: boolean }) => {
        if (j.ok === false) return;
        const latest = (j.accounts ?? [])
          .filter((a) => a.lastSyncedAt)
          .sort((a, b) => (b.lastSyncedAt ?? "").localeCompare(a.lastSyncedAt ?? ""))[0];
        const run = j.lastRun;
        const runSynced =
          run && (run.accountsDone ?? 0) > 0 && run.finishedAt ? run.finishedAt : null;
        setLastIso(latest?.lastSyncedAt ?? runSynced ?? null);
        const cd = j.manualSyncCooldown?.retryAfterSec ?? 0;
        setCooldownSec(cd > 0 ? cd : 0);
      })
      .catch(() => {});

    fetch("/api/sync/backfill/status")
      .then((r) => r.json())
      .then((j: { ok?: boolean; active?: BackfillStatus | null }) => {
        if (j.ok) setBackfill(j.active ?? null);
      })
      .catch(() => {});
  }, [clientId]);

  useEffect(() => {
    loadStatus();
    const onDone = () => loadStatus();
    window.addEventListener("traffic-sync-done", onDone);
    return () => window.removeEventListener("traffic-sync-done", onDone);
  }, [loadStatus]);

  useEffect(() => {
    if (!backfill) return;
    const id = window.setInterval(() => loadStatus(), 4000);
    return () => window.clearInterval(id);
  }, [backfill, loadStatus]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (cooldownSec <= 0) return;
    const id = window.setInterval(() => setCooldownSec((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [cooldownSec > 0]);

  function run() {
    if (cooldownSec > 0 || isPending) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/sync/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientId: clientId || undefined })
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
        errorCode?: string;
        retryAfterSec?: number;
        accounts?: number;
        accountsSynced?: number;
      } | null;
      if (!res.ok) {
        if (json?.errorCode === "sync_cooldown" && json.retryAfterSec) {
          setCooldownSec(json.retryAfterSec);
        } else {
          setError(json?.error ?? t("failed"));
        }
        return;
      }
      if ((json?.accounts ?? 0) === 0) {
        setError(t("noAccounts"));
        return;
      }
      window.dispatchEvent(new Event("traffic-sync-done"));
      loadStatus();
    });
  }

  function backfillHistorical() {
    if (isBackfillPending || isPending) return;
    startBackfillTransition(async () => {
      setError(null);
      await fetch("/api/sync/backfill", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ depthDays: 90, clientId: clientId || undefined })
      }).catch(() => {});
      window.setTimeout(() => loadStatus(), 1000);
    });
  }

  const cooldownMins = cooldownSec > 0 ? Math.max(1, Math.ceil(cooldownSec / 60)) : 0;
  const disabled = isPending || cooldownSec > 0;

  const backfillPct =
    backfill && backfill.daysTotal > 0
      ? Math.min(100, Math.round((backfill.daysDone / backfill.daysTotal) * 100))
      : 0;

  return (
    <div className="inline-flex flex-col items-end gap-1">
      {backfill ? (
        <div
          className="w-full min-w-[220px] rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-900"
          role="status"
        >
          <div className="font-medium">{t("backfillRunning")}</div>
          <div className="mt-1 text-violet-700">
            {t("backfillProgress", {
              accountsDone: backfill.accountsDone,
              accountsTotal: backfill.accountsTotal,
              daysDone: backfill.daysDone,
              daysTotal: backfill.daysTotal
            })}
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-violet-200">
            <div
              className="h-full rounded-full bg-violet-600 transition-all"
              style={{ width: `${backfillPct}%` }}
            />
          </div>
        </div>
      ) : null}
      <div className="inline-flex items-center gap-2">
        <span
          className={`text-xs ${error ? "text-rose-600" : "text-slate-500"}`}
          title={error ?? undefined}
        >
          {error
            ? error
            : lastIso
              ? `${t("updated")} ${formatRelative(lastIso, locale)}`
              : t("neverSynced")}
        </span>
        <button
          type="button"
          onClick={run}
          disabled={disabled}
          aria-label={t("now")}
          title={cooldownSec > 0 ? t("cooldownHint", { minutes: cooldownMins }) : t("now")}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-violet-600 shadow-sm transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg
            className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992V4.356M2.985 19.644v-4.992h4.992M19.5 9.349a8.25 8.25 0 0 0-14.13-3.349L2.985 8.36m0 0V4.356m18.03 11.284-2.385 2.36A8.25 8.25 0 0 1 4.5 14.652"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={backfillHistorical}
          disabled={isBackfillPending || isPending || cooldownSec > 0 || !!backfill}
          aria-label="Backfill histórico"
          title="Backfill histórico (90d)"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-violet-600 shadow-sm transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg
            className={`h-4 w-4 ${isBackfillPending ? "animate-spin" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 8v4l3 3" />
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 3v6h-6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
