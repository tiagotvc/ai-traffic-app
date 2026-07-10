"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";

import { useManualSyncCooldown } from "@/hooks/useManualSyncCooldown";
import { cn } from "@/lib/cn";

/**
 * Botão de sincronização único e contextual do hub de Campanhas: sincroniza a
 * plataforma em exibição (Meta via fila+cooldown, Google via backfill direto, ou ambas).
 * Após o Google, dispara "traffic-sync-done" para os painéis recarregarem.
 */
export function HubSyncButton({
  platform,
  clientFilter,
  className,
  size = 16
}: {
  platform: "meta" | "google" | "both";
  clientFilter?: string;
  className?: string;
  size?: number;
}) {
  const tSync = useTranslations("sync");
  const meta = useManualSyncCooldown(clientFilter);
  const [googleSyncing, setGoogleSyncing] = useState(false);

  const metaPart = platform !== "google";
  const googlePart = platform !== "meta" && !!clientFilter;

  const cooldownSec = metaPart ? meta.cooldownSec : 0;
  const cooldownMins = cooldownSec > 0 ? Math.max(1, Math.ceil(cooldownSec / 60)) : 0;
  const busy = meta.syncing || googleSyncing;
  const disabled = busy || cooldownSec > 0;

  const label =
    platform === "meta"
      ? tSync("syncMeta")
      : platform === "google"
        ? tSync("syncGoogle")
        : tSync("syncBoth");
  const text = busy ? tSync("syncing") : label;
  const title = cooldownSec > 0 ? tSync("cooldownHint", { minutes: cooldownMins }) : text;

  async function run() {
    if (disabled) return;
    const tasks: Promise<unknown>[] = [];
    if (metaPart) tasks.push(Promise.resolve(meta.runSync()));
    if (googlePart) {
      setGoogleSyncing(true);
      tasks.push(
        fetch(
          `/api/clients/${encodeURIComponent(clientFilter as string)}/google-ads/sync?days=30`,
          { method: "POST" }
        )
          .catch(() => undefined)
          .finally(() => {
            setGoogleSyncing(false);
            window.dispatchEvent(new Event("traffic-sync-done"));
          })
      );
    }
    await Promise.all(tasks);
  }

  return (
    <button
      type="button"
      onClick={() => void run()}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={cn(
        "ui-btn-accent-outline ui-btn-responsive font-heading font-semibold",
        disabled ? "cursor-not-allowed opacity-60" : "active:scale-95",
        className
      )}
    >
      <RefreshCw size={size} className={cn("shrink-0", busy && "animate-spin")} />
      <span className="ui-btn-responsive-label">{text}</span>
    </button>
  );
}
