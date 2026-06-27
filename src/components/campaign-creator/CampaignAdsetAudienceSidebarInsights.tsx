"use client";

import { useEffect, useMemo, useState } from "react";

import { AudienceCreationInsightsPanel } from "@/components/audiences/create/AudienceCreationInsightsPanel";
import type { PersonaSummary } from "@/components/audiences/PersonasLibraryClient";
import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";
import { getActiveAdset, type DraftTargeting } from "@/lib/campaign-draft";
import { extractPersonaTargetingItems } from "@/lib/audience-targeting-shared";
import { countDraftTargetingSegments } from "@/lib/campaign-targeting-insights";

function resolveGender(g?: string | null): DraftTargeting["gender"] {
  if (g === "male" || g === "female") return g;
  return "all";
}

export function CampaignAdsetAudienceSidebarInsights() {
  const { payload } = useCampaignDraft();
  const adset = getActiveAdset(payload);
  const targeting = adset.targeting;
  const mode = adset.targetingMode ?? "compiler";
  const [persona, setPersona] = useState<PersonaSummary | null>(null);

  useEffect(() => {
    if (!adset.personaId) {
      setPersona(null);
      return;
    }

    let cancelled = false;
    fetch("/api/personas")
      .then((r) => r.json())
      .then((j: { personas?: PersonaSummary[] }) => {
        if (cancelled) return;
        setPersona(j.personas?.find((p) => p.id === adset.personaId) ?? null);
      })
      .catch(() => {
        if (!cancelled) setPersona(null);
      });

    return () => {
      cancelled = true;
    };
  }, [adset.personaId]);

  const personaSegmentCount = useMemo(() => {
    if (!persona) return 0;
    return extractPersonaTargetingItems(persona.targeting).length;
  }, [persona]);

  const draftSegmentCount = countDraftTargetingSegments(targeting);
  const showPersonaSummary = mode === "compiler" && !!persona;
  const showDraftSummary = !showPersonaSummary && draftSegmentCount > 0;

  if (!showPersonaSummary && !showDraftSummary) return null;

  if (showPersonaSummary && persona) {
    return (
      <AudienceCreationInsightsPanel
        ageMin={persona.ageMin}
        ageMax={persona.ageMax}
        gender={resolveGender(persona.gender)}
        segmentCount={personaSegmentCount}
        validSegmentCount={personaSegmentCount}
        targeting={targeting}
        layout="stack"
        showPreview={false}
        showAlerts={false}
      />
    );
  }

  return (
    <AudienceCreationInsightsPanel
      ageMin={targeting.ageMin}
      ageMax={targeting.ageMax}
      gender={targeting.gender}
      segmentCount={draftSegmentCount}
      targeting={targeting}
      layout="stack"
      showPreview={false}
      showAlerts={false}
    />
  );
}
