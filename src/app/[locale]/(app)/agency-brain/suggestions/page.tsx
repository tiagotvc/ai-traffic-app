"use client";

import { ActionCenterContent } from "@/components/agency-brain/ActionCenterContent";
import { useAgencyBrainClient } from "@/components/agency-brain/AgencyBrainClientContext";

export default function SuggestionsPage() {
  const { clientSlug } = useAgencyBrainClient();
  return <ActionCenterContent clientId={clientSlug} />;
}
