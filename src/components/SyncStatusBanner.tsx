"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

type SyncStatusPayload = {
  lastManualSyncAt: string | null;
  lastRun: {
    status: string;
    finishedAt: string | null;
    lastError: string | null;
    accountsDone: number;
    accountsTotal: number;
  } | null;
  accounts: Array<{
    adAccountId: string;
    label: string | null;
    metaAdAccountId: string;
    lastSyncedAt: string | null;
    status: string;
  }>;
};

function formatRelative(iso: string | null, locale: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return locale.startsWith("pt") ? "agora" : "just now";
  if (mins < 60) return locale.startsWith("pt") ? `há ${mins} min` : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return locale.startsWith("pt") ? `há ${hrs}h` : `${hrs}h ago`;
  return d.toLocaleString(locale);
}

export function SyncStatusBanner({ clientId }: { clientId?: string }) {
  const t = useTranslations("sync");
  const locale = useLocale();
  const [data, setData] = useState<SyncStatusPayload | null>(null);

  const load = useCallback(() => {
    const q = clientId ? `?clientId=${encodeURIComponent(clientId)}` : "";
    fetch(`/api/sync/status${q}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok !== false) setData(j as SyncStatusPayload);
      })
      .catch(() => {});
  }, [clientId]);

  useEffect(() => {
    load();
    const onDone = () => load();
    window.addEventListener("traffic-sync-done", onDone);
    return () => window.removeEventListener("traffic-sync-done", onDone);
  }, [load]);

  if (!data) return null;

  const latestAccount = data.accounts
    .filter((a) => a.lastSyncedAt)
    .sort((a, b) => (b.lastSyncedAt ?? "").localeCompare(a.lastSyncedAt ?? ""))[0];

  const label = formatRelative(
    latestAccount?.lastSyncedAt ?? data.lastRun?.finishedAt ?? data.lastManualSyncAt,
    locale
  );

  const err = data.lastRun?.lastError;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
      <span className="font-medium text-slate-800">{t("lastUpdate")}:</span> {label}
      {data.lastRun ? (
        <span className="ml-2 text-slate-500">
          · {data.lastRun.accountsDone}/{data.lastRun.accountsTotal} {t("accountsSynced")}
        </span>
      ) : null}
      {err ? <div className="mt-1 text-red-600">{err}</div> : null}
    </div>
  );
}
