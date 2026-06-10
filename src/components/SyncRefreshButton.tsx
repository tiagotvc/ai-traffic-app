"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState, useTransition } from "react";

type SyncStatus = {
  lastManualSyncAt: string | null;
  lastRun: { finishedAt: string | null } | null;
  accounts: Array<{ lastSyncedAt: string | null }>;
  manualSyncCooldown?: { retryAfterSec: number } | null;
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
  const [isPending, startTransition] = useTransition();
  const [, setTick] = useState(0);

  const loadStatus = useCallback(() => {
    fetch("/api/sync/status")
      .then((r) => r.json())
      .then((j: SyncStatus & { ok?: boolean }) => {
        if (j.ok === false) return;
        const latest = (j.accounts ?? [])
          .filter((a) => a.lastSyncedAt)
          .sort((a, b) => (b.lastSyncedAt ?? "").localeCompare(a.lastSyncedAt ?? ""))[0];
        setLastIso(latest?.lastSyncedAt ?? j.lastRun?.finishedAt ?? j.lastManualSyncAt ?? null);
        const cd = j.manualSyncCooldown?.retryAfterSec ?? 0;
        setCooldownSec(cd > 0 ? cd : 0);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadStatus();
    const onDone = () => loadStatus();
    window.addEventListener("traffic-sync-done", onDone);
    return () => window.removeEventListener("traffic-sync-done", onDone);
  }, [loadStatus]);

  // Atualiza o texto relativo periodicamente.
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Contagem regressiva do cooldown.
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
      } | null;
      if (!res.ok) {
        if (json?.errorCode === "sync_cooldown" && json.retryAfterSec) {
          setCooldownSec(json.retryAfterSec);
        } else {
          setError(json?.error ?? t("failed"));
        }
        return;
      }
      window.dispatchEvent(new Event("traffic-sync-done"));
      loadStatus();
    });
  }

  const cooldownMins = cooldownSec > 0 ? Math.max(1, Math.ceil(cooldownSec / 60)) : 0;
  const disabled = isPending || cooldownSec > 0;

  return (
    <div className="inline-flex items-center gap-2">
      <span
        className={`text-xs ${error ? "text-rose-600" : "text-slate-500"}`}
        title={error ?? undefined}
      >
        {error ? error : `${t("updated")} ${formatRelative(lastIso, locale)}`}
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
    </div>
  );
}
