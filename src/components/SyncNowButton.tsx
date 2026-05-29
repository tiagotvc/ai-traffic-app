"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

export function SyncNowButton() {
  const t = useTranslations("sync");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await fetch("/api/sync/run", { method: "POST" });
            if (!res.ok) {
              const json = (await res.json().catch(() => null)) as { error?: string } | null;
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
        {isPending ? tCommon("syncing") : t("now")}
      </button>
      {error ? <div className="text-xs text-red-600">{error}</div> : null}
    </div>
  );
}
