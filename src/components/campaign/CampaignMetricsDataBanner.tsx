"use client";

import { Info, RefreshCw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { useManualSyncCooldown } from "@/hooks/useManualSyncCooldown";
import { cn } from "@/lib/cn";

function formatUpdatedAt(iso: string | null | undefined, locale: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(d);
}

export function CampaignMetricsDataBanner({
  dataUpdatedAt,
  clientFilter,
  className
}: {
  dataUpdatedAt?: string | null;
  clientFilter?: string;
  className?: string;
}) {
  const t = useTranslations("campaignsPage");
  const tSync = useTranslations("sync");
  const locale = useLocale();
  const formatted = formatUpdatedAt(dataUpdatedAt, locale);
  const { cooldownSec, syncing, runSync } = useManualSyncCooldown(clientFilter);

  const cooldownMins = cooldownSec > 0 ? Math.max(1, Math.ceil(cooldownSec / 60)) : 0;
  const syncDisabled = syncing || cooldownSec > 0;
  const syncTitle =
    cooldownSec > 0 ? tSync("cooldownHint", { minutes: cooldownMins }) : tSync("syncMeta");

  return (
    <div
      className={cn(
        "ui-alert-info flex w-full items-center justify-between gap-4 rounded-xl px-4 py-2.5 text-sm",
        className
      )}
      role="status"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <Info size={16} className="shrink-0 ui-alert-learnings__icon" aria-hidden />
        <p className="leading-snug">{t("metricsDataBannerShort")}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <p className="text-right text-xs font-medium tabular-nums" style={{ color: "var(--text-dim)" }}>
          {formatted ? t("metricsDataBannerUpdatedAt", { datetime: formatted }) : t("metricsDataBannerNever")}
        </p>
        <button
          type="button"
          onClick={() => void runSync()}
          disabled={syncDisabled}
          title={syncTitle}
          aria-label={syncTitle}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
            syncDisabled ? "cursor-not-allowed opacity-50" : "hover:bg-[var(--row-hover)]"
          )}
          style={{ borderColor: "var(--border-color)", color: "var(--ui-accent)" }}
        >
          <RefreshCw size={14} className={cn(syncing && "animate-spin")} />
        </button>
      </div>
    </div>
  );
}
