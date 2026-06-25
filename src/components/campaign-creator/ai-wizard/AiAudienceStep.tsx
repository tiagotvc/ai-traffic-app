"use client";

import { useTranslations } from "next-intl";

import { AiAudienceBriefFields } from "@/components/campaign-creator/ai-wizard/AiAudienceBriefFields";
import { PersonaPicker } from "@/components/campaign-creator/PersonaPicker";
import { usePublishAssets } from "@/hooks/usePublishAssets";
import type { AiCampaignWizardState } from "@/lib/campaign-creator/ai-campaign-wizard-types";

type Props = {
  state: AiCampaignWizardState;
  onChange: (patch: Partial<AiCampaignWizardState>) => void;
};

export function AiAudienceStep({ state, onChange }: Props) {
  const t = useTranslations("campaignCreator.aiWizard");
  const { audiences } = usePublishAssets(state.clientSlug, state.adAccountId);

  return (
    <div className="ui-card space-y-4 p-5">
      <div>
        <h2 className="font-heading text-lg font-semibold text-[var(--text-main)]">{t("audienceTitle")}</h2>
        <p className="mt-1 text-sm text-[var(--text-dim)]">{t("audienceHint")}</p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
            state.audienceMode === "create"
              ? "bg-[rgba(124,58,237,0.15)] text-[var(--violet)]"
              : "text-[var(--text-dim)] hover:bg-[var(--row-hover)]"
          }`}
          onClick={() => onChange({ audienceMode: "create" })}
        >
          {t("audienceModeCreate")}
        </button>
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
            state.audienceMode === "reuse"
              ? "bg-[rgba(124,58,237,0.15)] text-[var(--violet)]"
              : "text-[var(--text-dim)] hover:bg-[var(--row-hover)]"
          }`}
          onClick={() =>
            onChange({
              audienceMode: "reuse",
              audiencePreview: null,
              targetingSuggestion: null,
              personaFitSuggestions: [],
              metaAudienceFitSuggestions: []
            })
          }
        >
          {t("audienceModeReuse")}
        </button>
      </div>

      {state.audienceMode === "create" ? (
        <AiAudienceBriefFields
          businessDescription={state.businessDescription}
          targetProfile={state.targetProfile}
          onBusinessDescriptionChange={(v) => onChange({ businessDescription: v })}
          onTargetProfileChange={(v) => onChange({ targetProfile: v })}
        />
      ) : (
        <div className="space-y-4">
          <PersonaPicker
            value={state.selectedPersonaId}
            clientSlug={state.clientSlug}
            adAccountId={state.adAccountId}
            onChange={(id) => onChange({ selectedPersonaId: id, selectedMetaAudienceId: null })}
          />
          {audiences.length ? (
            <div>
              <label className="text-xs font-medium text-[var(--text-dim)]">
                {t("metaAudienceOptional")}
              </label>
              <select
                className="ui-select mt-1 w-full text-sm"
                value={state.selectedMetaAudienceId ?? ""}
                onChange={(e) =>
                  onChange({
                    selectedMetaAudienceId: e.target.value || null,
                    selectedPersonaId: e.target.value ? null : state.selectedPersonaId
                  })
                }
              >
                <option value="">{t("metaAudienceNone")}</option>
                {audiences.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      )}

      <p className="text-xs text-[var(--text-dimmer)]">{t("audienceDeferredHint")}</p>
    </div>
  );
}
