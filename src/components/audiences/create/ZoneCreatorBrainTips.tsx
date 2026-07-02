"use client";

import { Brain } from "lucide-react";
import { useTranslations } from "next-intl";

import type { ZoneCreatorSectionKey } from "@/components/audiences/create/zone-creator-steps";
import { ResearchPipelineCard } from "@/components/labs/ResearchPipelineCard";
import { useCommanderScientistsAccess } from "@/hooks/useCommanderScientistsAccess";
import { usePlatformFeature } from "@/hooks/usePlatformFeature";

const TIP_KEYS: Record<ZoneCreatorSectionKey, string> = {
  brief: "zoneTipBrief",
  places: "zoneTipPlaces",
  review: "zoneTipReview"
};

/**
 * Orion Brain do criador de zona: dica estática por etapa + dossiê unificado dos
 * cientistas (escopo zona = Geo + Testing) com feed ao vivo, quando há lugares.
 */
export function ZoneCreatorBrainTips({
  zoneSection,
  briefing,
  region,
  places,
  geoLocations
}: {
  zoneSection: ZoneCreatorSectionKey;
  briefing?: string;
  region?: string;
  places?: string[];
  geoLocations?: { label?: string; latitude: number; longitude: number; radius: number }[];
}) {
  const t = useTranslations("audiences");
  const brainEnabled = usePlatformFeature("audiences.brain");
  const researchEnabled = useCommanderScientistsAccess("campaigns.commander.scientists.audiences");

  const hasInput = Boolean((places && places.length) || (geoLocations && geoLocations.length));
  const signature = hasInput
    ? `${region ?? ""}|${(places ?? []).join(",")}|${(geoLocations ?? []).length}`
    : null;

  if (!brainEnabled) return null;

  return (
    <div className="campaign-creator-sidebar-card">
      <p className="campaign-creator-orion-section-label mb-2 inline-flex items-center gap-1.5">
        <Brain size={12} className="text-[var(--ui-accent)]" aria-hidden />
        Commander
      </p>
      <p className="text-xs leading-relaxed text-[var(--text-dim)]">{t(TIP_KEYS[zoneSection])}</p>

      {signature && researchEnabled ? (
        <div className="mt-3">
          <ResearchPipelineCard
            scope="zone"
            signature={signature}
            title="Commander"
            requestBody={{ region, briefing, places, geoLocations }}
          />
        </div>
      ) : null}
    </div>
  );
}
