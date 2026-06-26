"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Link } from "@/i18n/navigation";

export function ClientSyncBanner({ clientId }: { clientId: string }) {
  const t = useTranslations("sync");
  const [visible, setVisible] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromWizard = params.get("syncing") === "1";
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/sync/status?clientId=${encodeURIComponent(clientId)}`);
        const j = (await res.json()) as {
          activeSyncRunId?: string | null;
          lastRun?: { status: string } | null;
          needsAutoSync?: boolean;
        };
        if (cancelled) return;

        const running =
          !!j.activeSyncRunId ||
          j.lastRun?.status === "running" ||
          j.lastRun?.status === "queued";
        const completed =
          j.lastRun?.status === "completed" || j.lastRun?.status === "partial";

        if (fromWizard || running) {
          setVisible(true);
        }
        if (completed && !running) {
          setDone(true);
          window.dispatchEvent(new Event("traffic-sync-done"));
          window.setTimeout(() => setVisible(false), 8000);
        } else if (running || fromWizard) {
          window.setTimeout(poll, 2500);
        }
      } catch {
        if (!cancelled && fromWizard) setVisible(false);
      }
    }

    void poll();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (!visible) return null;

  return (
    <div
      className={`ui-card border px-4 py-3 text-sm ${
        done
          ? "border-[rgba(16,185,129,0.25)] bg-[rgba(16,185,129,0.06)] text-[var(--text-dim)]"
          : "border-[rgba(245,166,35,0.25)] bg-[rgba(245,166,35,0.08)] text-[var(--text-dim)]"
      }`}
      role="status"
    >
      <p>{done ? t("syncComplete") : t("syncingCampaigns")}</p>
      {done ? (
        <Link
          href={`/campaigns?client=${encodeURIComponent(clientId)}`}
          className="ui-link mt-2 inline-block text-xs font-semibold underline"
        >
          {t("viewCampaignsAfterSync")}
        </Link>
      ) : null}
    </div>
  );
}
