"use client";

import { ActionCenterAlerts } from "@/components/agency-brain/ActionCenterAlerts";
import { AgencyBrainModuleIntro } from "@/components/agency-brain/AgencyBrainModuleIntro";
import { SuggestionsContent } from "@/components/suggestions/SuggestionsContent";

export function ActionCenterContent({ clientId }: { clientId: string }) {
  return (
    <div className="space-y-4">
      <AgencyBrainModuleIntro moduleId="suggestions" compact />
      <ActionCenterAlerts clientId={clientId} />
      <SuggestionsContent clientId={clientId} />
    </div>
  );
}
