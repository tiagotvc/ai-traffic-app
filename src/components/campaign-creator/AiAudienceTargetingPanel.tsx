"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { AiAudienceTargetingForm } from "@/components/audiences/create/AiAudienceTargetingForm";
import type { PublishAudience } from "@/hooks/usePublishAssets";
import {
  applySuggestionToDraftTargeting,
  type AudienceTargetingSuggestion
} from "@/lib/audience-targeting-shared";
import type { DraftTargeting } from "@/lib/campaign-draft";

type Props = {
  clientSlug: string;
  clientName?: string;
  adAccountId: string;
  audiences: PublishAudience[];
  audiencesLoading?: boolean;
  currentTargeting: DraftTargeting;
  onApplyTargeting: (targeting: DraftTargeting) => void;
  disabled?: boolean;
};

export function AiAudienceTargetingPanel({
  clientSlug,
  adAccountId,
  audiences,
  audiencesLoading,
  currentTargeting,
  onApplyTargeting,
  disabled
}: Props) {
  const t = useTranslations("campaignCreator");
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!adAccountId) return null;

  async function handleApproveApply(suggestion: AudienceTargetingSuggestion) {
    const res = await fetch("/api/ai/audience-targeting", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        clientId: clientSlug,
        adAccountId,
        name: suggestion.name,
        targeting: suggestion.targeting,
        provider: suggestion.provider
      })
    });
    const j = await res.json();
    if (!j.ok) {
      throw new Error(j.error ?? t("aiAudienceSaveFailed"));
    }
    onApplyTargeting(applySuggestionToDraftTargeting(currentTargeting, suggestion));
    setExpanded(false);
  }

  return (
    <div className="rounded-xl border border-[rgba(124,58,237,0.2)] bg-gradient-to-br from-violet-50/80 to-[var(--surface-card)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[var(--text-main)]">{t("aiAudienceTitle")}</p>
          <p className="mt-0.5 text-[11px] text-[var(--text-dim)]">{t("aiAudienceHint")}</p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs font-medium text-[var(--violet)] underline"
        >
          {expanded ? t("aiAudienceCollapse") : t("aiAudienceExpand")}
        </button>
      </div>

      {expanded ? (
        <div className="mt-4">
          <AiAudienceTargetingForm
            mode="campaign"
            clientSlug={clientSlug}
            adAccountId={adAccountId}
            audiences={audiences}
            audiencesLoading={audiencesLoading}
            disabled={disabled}
            ageMin={currentTargeting.ageMin}
            ageMax={currentTargeting.ageMax}
            gender={currentTargeting.gender}
            countries={currentTargeting.locations
              .filter((l) => l.meta?.type === "country")
              .map((l) => l.meta?.countryCode ?? l.value)
              .filter(Boolean)
              .slice(0, 5)}
            onApproveApply={handleApproveApply}
            onError={setError}
          />
          {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
