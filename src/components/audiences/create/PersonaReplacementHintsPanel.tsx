"use client";

import { useTranslations } from "next-intl";

import type { AudienceTargetingSuggestion } from "@/lib/audience-targeting-shared";
import type { PersonaSegmentReplacement } from "@/lib/persona-targeting-types";

type Props = {
  metaReplacements?: PersonaSegmentReplacement[];
  apiHints?: AudienceTargetingSuggestion["replacementHints"];
};

function segmentTypeLabel(
  type: "interest" | "behavior" | "demographic",
  t: ReturnType<typeof useTranslations<"campaignCreator">>
) {
  if (type === "behavior") return t("aiAudienceChipBehavior");
  if (type === "demographic") return t("aiAudienceChipDemo");
  return t("aiAudienceChipInterest");
}

export function PersonaReplacementHintsPanel({ metaReplacements, apiHints }: Props) {
  const t = useTranslations("campaignCreator");
  const tAud = useTranslations("audiences");

  const rows: Array<{
    invalidId: string;
    invalidName: string;
    replacement: PersonaSegmentReplacement["replacement"];
    allAlternatives?: Array<{ id: string; name: string; type: "interest" | "behavior" | "demographic" }>;
  }> =
    apiHints?.map((h) => ({
      invalidId: h.rejected.id,
      invalidName: h.rejected.name,
      replacement:
        h.alternatives[0] != null
          ? {
              id: h.alternatives[0].id,
              name: h.alternatives[0].name,
              type: h.alternatives[0].type
            }
          : null,
      allAlternatives: h.alternatives
    })) ??
    metaReplacements?.map((r) => ({
      invalidId: r.invalidId,
      invalidName: r.invalidName,
      replacement: r.replacement
    })) ??
    [];

  if (!rows.length) return null;

  return (
    <div className="space-y-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-bg)] p-3">
      <p className="text-[10px] font-medium uppercase text-[var(--text-dimmer)]">
        {t("personaTargetingSuggestedReplacements")}
      </p>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.invalidId} className="text-xs">
            <p className="text-red-700 line-through dark:text-red-300">{row.invalidName}</p>
            {row.replacement ? (
              <p className="mt-1 text-[var(--text-main)]">
                → {segmentTypeLabel(row.replacement.type, t)}:{" "}
                <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                  {row.replacement.name}
                </span>
              </p>
            ) : (
              <p className="mt-1 text-[var(--text-dim)]">{t("personaTargetingNoReplacement")}</p>
            )}
            {row.allAlternatives && row.allAlternatives.length > 1 ? (
              <p className="mt-1 text-[10px] text-[var(--text-dimmer)]">
                {tAud("personaRepairMoreAlternatives")}:{" "}
                {row.allAlternatives
                  .slice(1, 4)
                  .map((a) => a.name)
                  .join(" · ")}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
