"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

import { useAgencyBrainAi } from "@/components/agency-brain/AgencyBrainAiContext";

export function AgencyBrainAiBar() {
  const t = useTranslations("agencyBrain");
  const { status, loading, aiDisabled } = useAgencyBrainAi();

  if (loading && !status) {
    return (
      <div className="ui-card px-4 py-3 text-sm text-slate-500">{t("aiStatusLoading")}</div>
    );
  }

  const usage = status?.usage;

  return (
    <div className="ui-card flex flex-wrap items-center gap-3 px-4 py-3">
      {usage ? (
        <div className="text-sm text-slate-700">
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
        <Link href="/billing" className="text-xs font-medium text-violet-600 hover:underline">
          {t("aiUpgrade")}
        </Link>
      ) : null}
    </div>
  );
}
