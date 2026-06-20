"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

import { useAgencyBrainAi } from "@/components/agency-brain/AgencyBrainAiContext";

export function AgencyBrainAiBar({ variant = "default" }: { variant?: "default" | "compact" | "uxpilot" }) {
  const t = useTranslations("agencyBrain");
  const { status, loading, aiDisabled } = useAgencyBrainAi();

  if (loading && !status) {
    if (variant === "compact") {
      return (
        <span className="inline-flex items-center rounded-full border border-[var(--border-color)] bg-white px-3 py-1 text-xs text-[var(--text-dimmer)]">
          {t("aiStatusLoading")}
        </span>
      );
    }
    return (
      <div className="ui-card px-4 py-3 text-sm text-[var(--text-dim)]">{t("aiStatusLoading")}</div>
    );
  }

  const usage = status?.usage;

  if (variant === "compact") {
    return (
      <div
        className="inline-flex select-none items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold"
        style={{
          background: "rgba(79,70,229,0.08)",
          borderColor: "rgba(79,70,229,0.22)",
          color: "#6366f1",
          fontFamily: "var(--font-heading)"
        }}
      >
        <svg className="h-3 w-3 fill-indigo-500" viewBox="0 0 24 24" fill="currentColor">
          <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
        </svg>
        {usage ? (
          <span className="font-bold tabular-nums">
            {usage.remaining} / {usage.maxAiRequestsPerMonth} {t("aiCreditsShort")}
          </span>
        ) : (
          <span>{t("aiStatusLoading")}</span>
        )}
      </div>
    );
  }

  if (variant === "uxpilot") {
    return (
      <div
        className="inline-flex select-none items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold"
        style={{
          background: "rgba(79,70,229,0.08)",
          borderColor: "rgba(79,70,229,0.22)",
          color: "#6366f1",
          fontFamily: "var(--font-heading)"
        }}
      >
        <svg className="h-3 w-3 fill-indigo-500" viewBox="0 0 24 24" fill="currentColor">
          <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
        </svg>
        {usage ? (
          <span className="font-bold tabular-nums">
            {usage.remaining} / {usage.maxAiRequestsPerMonth} {t("aiCreditsShort")}
          </span>
        ) : (
          <span>{t("aiStatusLoading")}</span>
        )}
      </div>
    );
  }

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
