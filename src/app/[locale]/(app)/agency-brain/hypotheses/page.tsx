"use client";

import { AgencyBrainClientGate } from "@/components/agency-brain/AgencyBrainClientGate";
import { HypothesesContent } from "@/components/agency-brain/HypothesesContent";

export default function HypothesesPage() {
  return (
    <AgencyBrainClientGate>
      {(clientSlug) => <HypothesesContent clientId={clientSlug} />}
    </AgencyBrainClientGate>
  );
}
