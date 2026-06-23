"use client";

import { useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";
import { useTransition } from "react";

import { cn } from "@/lib/cn";

export function MetaSyncButton({
  clientFilter,
  className,
  size = 16
}: {
  clientFilter?: string;
  className?: string;
  size?: number;
}) {
  const tSync = useTranslations("sync");
  const [syncing, startSync] = useTransition();

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
      title={syncing ? tSync("syncing") : tSync("syncMeta")}
      aria-label={syncing ? tSync("syncing") : tSync("syncMeta")}
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-heading text-sm font-semibold shadow-md transition-all duration-200",
        syncing ? "cursor-wait opacity-70" : "hover:brightness-110 active:scale-95",
        className
      )}
      style={{
        background: "linear-gradient(135deg, #f5a623, #e8920d)",
        color: "#0f1419"
      }}
    >
      <RefreshCw size={size} className={cn(syncing && "animate-spin")} />
    </button>
  );
}
