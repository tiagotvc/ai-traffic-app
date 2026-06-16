"use client";

import { ExperimentsContent } from "@/components/agency-brain/ExperimentsContent";
import { useAgencyBrainClient } from "@/components/agency-brain/AgencyBrainClientContext";

export default function ExperimentsPage() {
  const { clientSlug } = useAgencyBrainClient();
  return <ExperimentsContent clientId={clientSlug} />;
}
