"use client";

import { SuggestionsContent } from "@/components/suggestions/SuggestionsContent";
import { useAgencyBrainClient } from "@/components/agency-brain/AgencyBrainClientContext";

export default function SuggestionsPage() {
  const { clientSlug } = useAgencyBrainClient();
  return <SuggestionsContent clientId={clientSlug} />;
}
