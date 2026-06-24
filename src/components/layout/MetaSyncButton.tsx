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
  /** `toolbar` — ícone discreto no card branco; `prominent` — gradiente laranja. */
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
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-xs font-semibold shadow-sm transition hover:shadow-md",
          syncing ? "cursor-wait opacity-70" : "hover:border-[rgba(245,166,35,0.45)]",
          className
        )}
        style={{
          background: "var(--surface-card)",
          borderColor: "var(--border-color)",
          color: "#f5a623",
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
        }}
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
        "flex h-9 shrink-0 items-center justify-center rounded-lg font-heading text-sm font-semibold shadow-md transition-all duration-200",
        label ? "gap-1.5 px-2.5 text-[11px]" : "w-9",
        syncing ? "cursor-wait opacity-70" : "hover:brightness-110 active:scale-95",
        className
      )}
      style={{
        background: "linear-gradient(135deg, #f5a623, #e8920d)",
        color: "#0f1419"
      }}
    >
      <RefreshCw size={size} className={cn("shrink-0", syncing && "animate-spin")} />
      {label ? <span className="max-w-[88px] truncate whitespace-nowrap">{label}</span> : null}
    </button>
  );
}
