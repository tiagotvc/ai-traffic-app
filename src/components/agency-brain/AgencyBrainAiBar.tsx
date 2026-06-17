"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

import { useAgencyBrainAi } from "@/components/agency-brain/AgencyBrainAiContext";

export function AgencyBrainAiBar({ variant = "default" }: { variant?: "default" | "compact" }) {
  const t = useTranslations("agencyBrain");
  const { status, loading, aiDisabled } = useAgencyBrainAi();

  if (loading && !status) {
    if (variant === "compact") {
      return (
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-400">
          {t("aiStatusLoading")}
        </span>
      );
    }
    return (
      <div className="ui-card px-4 py-3 text-sm text-slate-500">{t("aiStatusLoading")}</div>
    );
  }

  const usage = status?.usage;

  if (variant === "compact") {
    return (
      <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-violet-200 bg-gradient-to-r from-violet-50 to-fuchsia-50 px-3 py-1.5 text-xs shadow-sm">
        <span className="font-semibold text-violet-700">✦ IA</span>
        {usage ? (
          usage.remaining > 0 ? (
            <span className="text-violet-800">
              {t("aiUsageShort", {
                remaining: usage.remaining,
                max: usage.maxAiRequestsPerMonth
              })}
            </span>
          ) : (
            <span className="text-amber-800">
              {t("aiUsageEmptyShort", { max: usage.maxAiRequestsPerMonth })}
            </span>
          )
        ) : null}
        {!status?.geminiConfigured ? (
          <span className="text-amber-700">{t("aiNoKeyShort")}</span>
        ) : null}
        {aiDisabled && status?.featureAllowed && status.geminiConfigured ? (
          <Link href="/billing" className="font-medium text-violet-600 hover:underline">
            {t("aiUpgrade")}
          </Link>
        ) : null}
      </div>
    );
  }

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
