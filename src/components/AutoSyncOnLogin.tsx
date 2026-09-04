"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { lastNDaysRange } from "@/components/GoogleDateRangePicker";
import { requestFreshDataRange } from "@/hooks/useFreshDataRange";

const SESSION_KEY = "traffic-auto-sync-done-v2";

/** Garante dados frescos do intervalo padrão em toda nova sessão autenticada. */
export function AutoSyncOnLogin() {
  const t = useTranslations("sync");
  const tCommon = useTranslations("common");
  const started = useRef(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (sessionStorage.getItem(SESSION_KEY) === "1") return;
    let cancelled = false;
    setSyncing(true);
    requestFreshDataRange({ platforms: ["meta", "google"], range: lastNDaysRange(30) })
      .then(() => { if (!cancelled) sessionStorage.setItem(SESSION_KEY, "1"); })
      .catch(() => { if (!cancelled) setError(t("failed")); })
      .finally(() => { if (!cancelled) setSyncing(false); });
    return () => { cancelled = true; };
  }, [t]);

  if (!syncing && !error) return null;
  return (
    <div className={`fixed bottom-4 right-4 z-50 max-w-sm px-4 py-3 text-sm shadow-lg ${error ? "ui-alert-danger" : "ui-card border-[rgba(245,166,35,0.25)] text-[var(--text-dim)]"}`} role="status">
      {syncing ? <span>{t("autoOnLogin")} {tCommon("syncing").toLowerCase()}…</span> : <span>{error}</span>}
    </div>
  );
}
