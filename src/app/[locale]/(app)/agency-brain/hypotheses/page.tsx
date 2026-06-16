"use client";

import { HypothesesContent } from "@/components/agency-brain/HypothesesContent";
import { useAgencyBrainClient } from "@/components/agency-brain/AgencyBrainClientContext";

export default function HypothesesPage() {
  const { clientSlug } = useAgencyBrainClient();
  return <HypothesesContent clientId={clientSlug} />;
}
