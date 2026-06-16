"use client";

import { TimelineContent } from "@/components/agency-brain/TimelineContent";
import { useAgencyBrainClient } from "@/components/agency-brain/AgencyBrainClientContext";

export default function TimelinePage() {
  const { clientSlug } = useAgencyBrainClient();
  return <TimelineContent clientId={clientSlug} />;
}
