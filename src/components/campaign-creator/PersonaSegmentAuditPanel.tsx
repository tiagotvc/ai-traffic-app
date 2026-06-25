"use client";

import { useTranslations } from "next-intl";

import type { PersonaSegmentReplacement, PersonaTargetingIssue } from "@/lib/persona-targeting-types";

type Props = {
  issue: PersonaTargetingIssue;
};

function segmentTypeLabel(
  type: "interest" | "behavior" | "demographic",
  t: ReturnType<typeof useTranslations<"campaignCreator">>
) {
  if (type === "behavior") return t("aiAudienceChipBehavior");
  if (type === "demographic") return t("aiAudienceChipDemo");
  return t("aiAudienceChipInterest");
}

export function PersonaSegmentAuditPanel({ issue }: Props) {
  const t = useTranslations("campaignCreator");

  const replacementByInvalid = new Map(
    issue.replacements.map((r) => [r.invalidId, r] as const)
  );

  return (
    <div className="space-y-3">
      {issue.segments.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[10px] font-medium uppercase text-[var(--text-dimmer)]">
            {t("personaTargetingAllSegments")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {issue.segments.map((seg) => {
              const rejected = !seg.valid;
              return (
                <span
                  key={seg.id}
                  className={`rounded-full px-2 py-0.5 text-[10px] ${
                    rejected
                      ? "border border-red-300 bg-red-50 font-semibold text-red-800 line-through dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
                      : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                  }`}
                  title={seg.id}
                >
                  {segmentTypeLabel(seg.type, t)}: {seg.name}
                  {rejected ? ` (${t("personaTargetingDiscontinued")})` : ""}
                </span>
              );
            })}
          </div>
        </div>
      ) : null}

      {issue.replacements.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[10px] font-medium uppercase text-[var(--text-dimmer)]">
            {t("personaTargetingSuggestedReplacements")}
          </p>
          <ul className="space-y-2">
            {issue.replacements.map((row: PersonaSegmentReplacement) => (
              <li
                key={row.invalidId}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-bg)] p-2 text-xs"
              >
                <p className="text-red-700 line-through dark:text-red-300">{row.invalidName}</p>
                {row.replacement ? (
                  <p className="mt-1 text-[var(--text-main)]">
                    → {segmentTypeLabel(row.replacement.type, t)}:{" "}
                    <span className="font-semibold">{row.replacement.name}</span>
                  </p>
                ) : (
                  <p className="mt-1 text-[var(--text-dim)]">{t("personaTargetingNoReplacement")}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
