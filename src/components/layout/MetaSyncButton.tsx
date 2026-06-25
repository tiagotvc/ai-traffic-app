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
  const [syncing, startSync] = useTransition();
  const text = syncing ? tSync("syncing") : label ?? tSync("syncMeta");
  const aria = text;

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

  return (
    <button
      type="button"
      onClick={handleSync}
      disabled={syncing}
      title={aria}
      aria-label={aria}
      className={cn(
        "ui-btn-accent-outline ui-btn-responsive font-heading font-semibold",
        syncing ? "cursor-wait opacity-70" : "active:scale-95",
        className
      )}
    >
      <RefreshCw size={size} className={cn("shrink-0", syncing && "animate-spin")} />
      <span className="ui-btn-responsive-label">{text}</span>
    </button>
  );
}
