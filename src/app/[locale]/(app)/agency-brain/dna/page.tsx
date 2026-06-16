"use client";

import { DnaContent } from "@/components/agency-brain/DnaContent";
import { useAgencyBrainClient } from "@/components/agency-brain/AgencyBrainClientContext";

export default function DnaPage() {
  const { clientSlug } = useAgencyBrainClient();
  return <DnaContent clientId={clientSlug} />;
}
