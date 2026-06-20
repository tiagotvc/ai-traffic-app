"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

const SESSION_KEY = "traffic-auto-sync-done";

type SyncStatus = {
  needsAutoSync?: boolean;
  lastRun?: { status: string; finishedAt: string | null } | null;
  accounts?: Array<{ status: string; lastSyncedAt: string | null }>;
};

export function AutoSyncOnLogin() {
  const t = useTranslations("sync");
  const tCommon = useTranslations("common");
  const started = useRef(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    let cancelled = false;

    (async () => {
      try {
        const statusRes = await fetch("/api/sync/status");
        const status = (await statusRes.json().catch(() => null)) as SyncStatus | null;
        if (cancelled) return;

        const alreadySyncedThisSession =
          typeof window !== "undefined" && sessionStorage.getItem(SESSION_KEY) === "1";

        const neverSynced =
          status?.needsAutoSync ||
          !status?.accounts?.some((a) => a.status === "ok" || a.lastSyncedAt);

        if (alreadySyncedThisSession && !neverSynced) return;

        setSyncing(true);
        const res = await fetch("/api/sync/run", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ auto: true })
        });
        const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
        if (cancelled) return;

        if (res.ok && json?.ok !== false) {
          sessionStorage.setItem(SESSION_KEY, "1");
          window.dispatchEvent(new Event("traffic-sync-done"));

          // Backfill histórico (não-bloqueante).
          void fetch("/api/sync/backfill", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ depthDays: 90 })
          }).catch(() => {});
        } else if (json?.error) {
          setError(json.error);
        }
      } catch {
        if (!cancelled) setError(t("failed"));
      } finally {
        if (!cancelled) setSyncing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [t]);

  if (!syncing && !error) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 max-w-sm px-4 py-3 text-sm shadow-lg ${
        error ? "ui-alert-danger" : "ui-card border-[rgba(245,166,35,0.25)] text-[var(--text-dim)]"
      }`}
      role="status"
    >
      {syncing ? (
        <span>
          {t("autoOnLogin")} {tCommon("syncing").toLowerCase()}…
        </span>
      ) : (
        <span>{error}</span>
      )}
    </div>
  );
}
