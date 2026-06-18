"use client";

import { ActionCenterContent } from "@/components/agency-brain/ActionCenterContent";
import { AgencyBrainClientGate } from "@/components/agency-brain/AgencyBrainClientGate";

export default function SuggestionsPage() {
  return (
    <AgencyBrainClientGate>
      {(clientSlug) => <ActionCenterContent clientId={clientSlug} />}
    </AgencyBrainClientGate>
  );
}
