"use client";

import { useTranslations } from "next-intl";

import type { PersonaTargetingSummary } from "@/lib/persona-targeting-types";

type Props = {
  summary: PersonaTargetingSummary;
  onFix?: () => void;
};

function segmentTypeLabel(
  type: "interest" | "behavior" | "demographic",
  t: ReturnType<typeof useTranslations<"campaignCreator">>
) {
  if (type === "behavior") return t("aiAudienceChipBehavior");
  if (type === "demographic") return t("aiAudienceChipDemo");
  return t("aiAudienceChipInterest");
}

export function PersonaMetaValidationPanel({ summary, onFix }: Props) {
  const t = useTranslations("campaignCreator");

  if (summary.valid) {
    return (
      <div className="ui-alert-success space-y-2 p-3 text-xs">
        <p className="font-medium text-emerald-900 dark:text-emerald-100">
          {t("personaTargetingMetaOk")}
        </p>
        <p className="text-[var(--text-dim)]">{t("personaTargetingMetaOkHint")}</p>
        {summary.segments.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {summary.segments.map((seg) => (
              <span
                key={seg.id}
                className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                title={seg.id}
              >
                {segmentTypeLabel(seg.type, t)}: {seg.name}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="ui-alert-warning space-y-2 p-3 text-xs">
      <p className="font-medium">{t("personaTargetingMetaReview")}</p>
      <div className="flex flex-wrap gap-1.5">
        {summary.segments
          .filter((s) => !s.valid)
          .map((seg) => (
            <span
              key={seg.id}
              className="rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-800 line-through"
              title={seg.id}
            >
              {segmentTypeLabel(seg.type, t)}: {seg.name}
            </span>
          ))}
      </div>
      {onFix ? (
        <button type="button" className="ui-link-amber text-xs font-medium" onClick={onFix}>
          {t("personaTargetingFixNow")}
        </button>
      ) : null}
    </div>
  );
}
