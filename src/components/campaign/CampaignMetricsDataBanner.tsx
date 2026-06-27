"use client";

import { RefreshCw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { DsInfoBanner } from "@/design-system";
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
    <DsInfoBanner
      className={cn("px-4 py-2.5 text-sm", className)}
      actions={
        <>
          <p className="text-right text-xs font-medium tabular-nums text-[var(--text-dim)]">
            {formatted ? t("metricsDataBannerUpdatedAt", { datetime: formatted }) : t("metricsDataBannerNever")}
          </p>
          <button
            type="button"
            onClick={() => void runSync()}
            disabled={syncDisabled}
            title={syncTitle}
            aria-label={syncTitle}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-color)] text-[var(--ui-accent)] transition-colors",
              syncDisabled ? "cursor-not-allowed opacity-50" : "hover:bg-[var(--row-hover)]"
            )}
          >
            <RefreshCw size={14} className={cn(syncing && "animate-spin")} />
          </button>
        </>
      }
    >
      {t("metricsDataBannerShort")}
    </DsInfoBanner>
  );
}
