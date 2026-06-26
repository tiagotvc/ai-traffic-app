"use client";

import { useCallback, useEffect, useState } from "react";

type SyncRunResponse = {
  ok?: boolean;
  error?: string;
  errorCode?: string;
  retryAfterSec?: number;
};

export function useManualSyncCooldown(clientFilter?: string) {
  const [cooldownSec, setCooldownSec] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const loadStatus = useCallback(() => {
    const qs = clientFilter?.trim() ? `?clientId=${encodeURIComponent(clientFilter.trim())}` : "";
    fetch(`/api/sync/status${qs}`)
      .then((r) => r.json())
      .then((j: { manualSyncCooldown?: { retryAfterSec: number } | null }) => {
        const cd = j.manualSyncCooldown?.retryAfterSec ?? 0;
        setCooldownSec(cd > 0 ? cd : 0);
      })
      .catch(() => {});
  }, [clientFilter]);

  useEffect(() => {
    loadStatus();
    const onDone = () => loadStatus();
    window.addEventListener("traffic-sync-done", onDone);
    return () => window.removeEventListener("traffic-sync-done", onDone);
  }, [loadStatus]);

  useEffect(() => {
    if (cooldownSec <= 0) return;
    const id = window.setInterval(() => setCooldownSec((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [cooldownSec > 0]);

  async function runSync(): Promise<SyncRunResponse> {
    if (syncing || cooldownSec > 0) return { ok: false };
    setSyncing(true);
    try {
      const res = await fetch("/api/sync/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientId: clientFilter?.trim() || undefined })
      });
      const json = (await res.json().catch(() => ({}))) as SyncRunResponse;
      if (!res.ok) {
        if (json.errorCode === "sync_cooldown" && json.retryAfterSec) {
          setCooldownSec(json.retryAfterSec);
        }
        return { ok: false, error: json.error, errorCode: json.errorCode, retryAfterSec: json.retryAfterSec };
      }
      window.dispatchEvent(new Event("traffic-sync-done"));
      loadStatus();
      return { ok: true };
    } finally {
      setSyncing(false);
    }
  }

  return { cooldownSec, syncing, runSync, loadStatus };
}
