"use client";

import { AgencyBrainClientGate } from "@/components/agency-brain/AgencyBrainClientGate";
import { TimelineContent } from "@/components/agency-brain/TimelineContent";

export default function TimelinePage() {
  return (
    <AgencyBrainClientGate>
      {(clientSlug) => <TimelineContent clientId={clientSlug} />}
    </AgencyBrainClientGate>
  );
}
