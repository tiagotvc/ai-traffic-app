"use client";

import { AgencyBrainContent } from "@/components/agency-brain/AgencyBrainContent";
import { useAgencyBrainClient } from "@/components/agency-brain/AgencyBrainClientContext";

export default function LearningsPage() {
  const { clientSlug } = useAgencyBrainClient();
  return <AgencyBrainContent clientId={clientSlug} />;
}
