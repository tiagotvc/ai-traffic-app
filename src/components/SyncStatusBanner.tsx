"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

type MetaConnectionPayload = {
  role: "admin" | "member";
  tokenSource: "workspace" | "own" | null;
  hasWorkspaceToken: boolean;
  hasEffectiveToken: boolean;
  hintCode: "member_no_workspace_meta" | "admin_reconnect_meta" | null;
};

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
  metaConnection?: MetaConnectionPayload;
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

  const contextHint = useMemo(() => {
    const mc = data?.metaConnection;
    if (!mc) return null;
    if (mc.hintCode === "member_no_workspace_meta") return t("hintMemberNoWorkspaceMeta");
    if (mc.hintCode === "admin_reconnect_meta") return t("hintAdminReconnectMeta");
    if (mc.role === "member" && data?.lastRun?.lastError) return t("hintMemberAccountAccess");
    return null;
  }, [data, t]);

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
    <div className="ui-card bg-[var(--surface-thead)] px-3 py-2 text-xs text-[var(--text-dim)]">
      <span className="font-medium text-[var(--text-main)]">{t("lastUpdate")}:</span> {label}
      {data.lastRun ? (
        <span className="ml-2 text-[var(--text-dimmer)]">
          · {data.lastRun.accountsDone}/{data.lastRun.accountsTotal} {t("accountsSynced")}
        </span>
      ) : null}
      {err ? <div className="mt-1 text-[var(--danger)]">{err}</div> : null}
      {contextHint ? <div className="mt-1 text-[var(--text-dim)]">{contextHint}</div> : null}
    </div>
  );
}
