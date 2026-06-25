"use client";

import { useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";
import { useTransition } from "react";

import { cn } from "@/lib/cn";

export function MetaSyncButton({
  clientFilter,
  className,
  size = 16,
  label,
  variant = "prominent"
}: {
  clientFilter?: string;
  className?: string;
  size?: number;
  label?: string;
  /** `toolbar` — ícone discreto; `prominent` — CTA com accent temático. */
  variant?: "toolbar" | "prominent";
}) {
  const tSync = useTranslations("sync");
  const [syncing, startSync] = useTransition();
  const aria = syncing ? tSync("syncing") : label ?? tSync("syncMeta");

  function handleSync() {
    if (syncing) return;
    startSync(async () => {
      const res = await fetch("/api/sync/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientId: clientFilter || undefined })
      });
      if (res.ok) {
        window.dispatchEvent(new Event("traffic-sync-done"));
      }
    });
  }

  if (variant === "toolbar") {
    return (
      <button
        type="button"
        onClick={handleSync}
        disabled={syncing}
        title={aria}
        aria-label={aria}
        className={cn(
          "ui-toolbar-icon-btn text-[var(--ui-accent)]",
          syncing && "cursor-wait opacity-70",
          className
        )}
      >
        <RefreshCw size={size} className={cn("shrink-0", syncing && "animate-spin")} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSync}
      disabled={syncing}
      title={aria}
      aria-label={aria}
      className={cn(
        "ui-btn-accent h-9 shrink-0 font-heading text-sm font-semibold",
        label ? "gap-1.5 px-2.5 text-[11px]" : "w-9 justify-center",
        syncing ? "cursor-wait opacity-70" : "active:scale-95",
        className
      )}
    >
      <RefreshCw size={size} className={cn("shrink-0", syncing && "animate-spin")} />
      {label ? <span className="max-w-[88px] truncate whitespace-nowrap">{label}</span> : null}
    </button>
  );
}
