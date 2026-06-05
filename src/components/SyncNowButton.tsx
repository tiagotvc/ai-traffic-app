"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState, useTransition } from "react";

type CooldownState = { retryAfterSec: number } | null;

export function SyncNowButton({
  clientId,
  adAccountIds,
  compact
}: {
  clientId?: string;
  adAccountIds?: string[];
  compact?: boolean;
}) {
  const t = useTranslations("sync");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<CooldownState>(null);

  const loadCooldown = useCallback(() => {
    fetch("/api/sync/status")
      .then((r) => r.json())
      .then((j) => {
        const cd = j.manualSyncCooldown as CooldownState;
        setCooldown(cd?.retryAfterSec ? cd : null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadCooldown();
  }, [loadCooldown]);

  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setInterval(() => {
      setCooldown((prev) => {
        if (!prev || prev.retryAfterSec <= 1) return null;
        return { retryAfterSec: prev.retryAfterSec - 1 };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown !== null]);

  const cooldownActive = (cooldown?.retryAfterSec ?? 0) > 0;
  const cooldownMins = cooldownActive ? Math.max(1, Math.ceil(cooldown!.retryAfterSec / 60)) : 0;

  return (
    <div className={compact ? "inline-flex flex-col items-start gap-1" : "flex flex-col gap-1"}>
      <div className={compact ? "inline-flex items-center gap-2" : "flex items-center gap-2"}>
        <button
          onClick={() => {
            if (cooldownActive) return;
            setError(null);
            startTransition(async () => {
              const res = await fetch("/api/sync/run", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  clientId: clientId || undefined,
                  adAccountIds: adAccountIds?.length ? adAccountIds : undefined
                })
              });
              const json = (await res.json().catch(() => null)) as {
                error?: string;
                errorCode?: string;
                retryAfterSec?: number;
              } | null;
              if (!res.ok) {
                if (json?.errorCode === "sync_cooldown" && json.retryAfterSec) {
                  setCooldown({ retryAfterSec: json.retryAfterSec });
                  setError(json.error ?? t("cooldownHint", { minutes: Math.max(1, Math.ceil(json.retryAfterSec / 60)) }));
                } else {
                  setError(json?.error ?? t("failed"));
                }
                return;
              }
              setCooldown(null);
              router.refresh();
              window.dispatchEvent(new Event("traffic-sync-done"));
              loadCooldown();
            });
          }}
          disabled={isPending || cooldownActive}
          title={cooldownActive ? t("cooldownHint", { minutes: cooldownMins }) : undefined}
          className="ui-btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending
            ? tCommon("syncing")
            : cooldownActive
              ? t("cooldownButton", { minutes: cooldownMins })
              : clientId
                ? t("nowClient")
                : t("now")}
        </button>
      </div>
      {cooldownActive && !error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900">
          {t("cooldownHint", { minutes: cooldownMins })}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-800">
          {error}
        </div>
      ) : null}
    </div>
  );
}
