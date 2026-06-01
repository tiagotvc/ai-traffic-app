"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

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

  return (
    <div className={compact ? "inline-flex items-center gap-2" : "flex items-center gap-2"}>
      <button
        onClick={() => {
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
            const json = (await res.json().catch(() => null)) as { error?: string } | null;
            if (!res.ok) {
              setError(json?.error ?? t("failed"));
              return;
            }
            router.refresh();
            window.dispatchEvent(new Event("traffic-sync-done"));
          });
        }}
        disabled={isPending}
        className="ui-btn-secondary disabled:cursor-not-allowed"
      >
        {isPending ? tCommon("syncing") : clientId ? t("nowClient") : t("now")}
      </button>
      {error ? <div className="text-xs text-red-600">{error}</div> : null}
    </div>
  );
}
