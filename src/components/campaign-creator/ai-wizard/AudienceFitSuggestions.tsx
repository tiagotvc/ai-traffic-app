"use client";

import { useTranslations } from "next-intl";

import type { AudienceFitSuggestion } from "@/lib/campaign-creator/ai-campaign-wizard-types";

type Props = {
  personaSuggestions: AudienceFitSuggestion[];
  metaSuggestions: AudienceFitSuggestion[];
  selectedPersonaId: string | null;
  selectedMetaAudienceId: string | null;
  onSelectPersona: (id: string | null) => void;
  onSelectMetaAudience: (id: string | null) => void;
};

export function AudienceFitSuggestions({
  personaSuggestions,
  metaSuggestions,
  selectedPersonaId,
  selectedMetaAudienceId,
  onSelectPersona,
  onSelectMetaAudience
}: Props) {
  const t = useTranslations("campaignCreator.aiWizard");
  const all = [...personaSuggestions, ...metaSuggestions];

  if (!all.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-[var(--text-dim)]">{t("fitSuggestionsTitle")}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {personaSuggestions.map((s) => {
          const selected = selectedPersonaId === s.id;
          return (
            <button
              key={`persona-${s.id}`}
              type="button"
              onClick={() => {
                onSelectMetaAudience(null);
                onSelectPersona(selected ? null : s.id);
              }}
              className={`rounded-xl border p-3 text-left transition ${
                selected
                  ? "border-[var(--violet)] bg-[rgba(124,58,237,0.08)]"
                  : "border-[var(--border-color)] bg-[var(--surface-card)] hover:border-[var(--violet)]/40"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[var(--text-main)]">{s.name}</span>
                <span className="rounded-full bg-[rgba(124,58,237,0.12)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--violet)]">
                  {t("fitPersonaBadge")}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-[var(--text-dim)]">{s.reason}</p>
            </button>
          );
        })}
        {metaSuggestions.map((s) => {
          const selected = selectedMetaAudienceId === s.id;
          return (
            <button
              key={`meta-${s.id}`}
              type="button"
              onClick={() => {
                onSelectPersona(null);
                onSelectMetaAudience(selected ? null : s.id);
              }}
              className={`rounded-xl border p-3 text-left transition ${
                selected
                  ? "border-[var(--violet)] bg-[rgba(124,58,237,0.08)]"
                  : "border-[var(--border-color)] bg-[var(--surface-card)] hover:border-[var(--violet)]/40"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[var(--text-main)]">{s.name}</span>
                <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                  {t("fitMetaBadge")}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-[var(--text-dim)]">{s.reason}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
