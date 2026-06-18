"use client";

import { ActionPlansContent } from "@/components/agency-brain/ActionPlansContent";
import { AgencyBrainClientGate } from "@/components/agency-brain/AgencyBrainClientGate";

export default function ActionPlansPage() {
  return (
    <AgencyBrainClientGate>
      {(clientSlug) => <ActionPlansContent clientId={clientSlug} />}
    </AgencyBrainClientGate>
  );
}
