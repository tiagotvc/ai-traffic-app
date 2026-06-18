"use client";

import { AgencyBrainClientGate } from "@/components/agency-brain/AgencyBrainClientGate";
import { ExperimentsContent } from "@/components/agency-brain/ExperimentsContent";

export default function ExperimentsPage() {
  return (
    <AgencyBrainClientGate>
      {(clientSlug) => <ExperimentsContent clientId={clientSlug} />}
    </AgencyBrainClientGate>
  );
}
