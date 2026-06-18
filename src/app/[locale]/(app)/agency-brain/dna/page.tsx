"use client";

import { AgencyBrainClientGate } from "@/components/agency-brain/AgencyBrainClientGate";
import { DnaContent } from "@/components/agency-brain/DnaContent";

export default function DnaPage() {
  return (
    <AgencyBrainClientGate>
      {(clientSlug) => <DnaContent clientId={clientSlug} />}
    </AgencyBrainClientGate>
  );
}
