"use client";

import { Brain } from "lucide-react";

import type { ZoneCreatorSectionKey } from "@/components/audiences/create/zone-creator-steps";
import { CommanderObservingIndicator } from "@/components/commander/CommanderObservingIndicator";
import { ResearchPipelineCard } from "@/components/labs/ResearchPipelineCard";
import { useCommanderScientistsAccess } from "@/hooks/useCommanderScientistsAccess";
import { usePlatformFeature } from "@/hooks/usePlatformFeature";

/**
 * Orion Brain do criador de zona: indicador discreto de observação + dossiê
 * unificado dos cientistas (escopo zona = Geo + Testing) com feed ao vivo, quando
 * há lugares. O veredito assertivo de verdade aparece na área de revisão
 * (ZoneCreatorUxPage), não aqui — aqui é só "estou acompanhando".
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
  const brainEnabled = usePlatformFeature("commander.modules.audiences");
  const researchEnabled = useCommanderScientistsAccess("commander.scientists.audiences");

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
      <CommanderObservingIndicator />

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
