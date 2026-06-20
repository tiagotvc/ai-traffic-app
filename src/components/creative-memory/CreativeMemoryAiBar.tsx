"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

import { useCreativeMemoryAi } from "@/components/creative-memory/CreativeMemoryAiContext";

export function CreativeMemoryAiBar() {
  const t = useTranslations("creativeMemory");
  const { status, loading, aiDisabled } = useCreativeMemoryAi();

  if (loading && !status) {
    return (
      <div className="ui-card px-4 py-3 text-sm text-[var(--text-dim)]">{t("aiStatusLoading")}</div>
    );
  }

  const usage = status?.usage;

  return (
    <div className="ui-card flex flex-wrap items-center gap-3 px-4 py-3">
      {usage ? (
        <div className="text-sm text-[var(--text-dim)]">
          {usage.remaining > 0 ? (
            <span>
              {t("aiUsage", {
                remaining: usage.remaining,
                max: usage.maxAiRequestsPerMonth
              })}
            </span>
          ) : (
            <span className="text-amber-800">
              {t("aiUsageEmpty", { max: usage.maxAiRequestsPerMonth })}
            </span>
          )}
        </div>
      ) : null}

      {!status?.geminiConfigured ? (
        <span className="text-xs text-amber-700">{t("aiNoKey")}</span>
      ) : null}

      {aiDisabled && status?.featureAllowed && status.geminiConfigured ? (
        <Link href="/billing" className="ui-link text-xs font-medium">
          {t("aiUpgrade")}
        </Link>
      ) : null}
    </div>
  );
}
