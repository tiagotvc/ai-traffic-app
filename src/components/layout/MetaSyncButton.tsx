"use client";

import { useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";

import { useManualSyncCooldown } from "@/hooks/useManualSyncCooldown";
import { cn } from "@/lib/cn";

export function MetaSyncButton({
  clientFilter,
  className,
  size = 16,
  label,
  variant = "outline"
}: {
  clientFilter?: string;
  className?: string;
  size?: number;
  label?: string;
  /** @deprecated Use outline (default). Kept for call-site compatibility. */
  variant?: "toolbar" | "outline" | "prominent";
}) {
  const tSync = useTranslations("sync");
  const { cooldownSec, syncing, runSync } = useManualSyncCooldown(clientFilter);

  const cooldownMins = cooldownSec > 0 ? Math.max(1, Math.ceil(cooldownSec / 60)) : 0;
  const disabled = syncing || cooldownSec > 0;
  const text = syncing ? tSync("syncing") : label ?? tSync("syncMeta");
  const title =
    cooldownSec > 0 ? tSync("cooldownHint", { minutes: cooldownMins }) : text;

  async function handleSync() {
    if (disabled) return;
    await runSync();
  }

  return (
    <button
      type="button"
      onClick={() => void handleSync()}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={cn(
        "ui-btn-accent-outline ui-btn-responsive font-heading font-semibold",
        disabled ? "cursor-not-allowed opacity-60" : "active:scale-95",
        className
      )}
    >
      <RefreshCw size={size} className={cn("shrink-0", syncing && "animate-spin")} />
      <span className="ui-btn-responsive-label">{text}</span>
    </button>
  );
}
