"use client";

import { ActionPlansContent } from "@/components/agency-brain/ActionPlansContent";
import { useAgencyBrainClient } from "@/components/agency-brain/AgencyBrainClientContext";

export default function ActionPlansPage() {
  const { clientSlug } = useAgencyBrainClient();
  return <ActionPlansContent clientId={clientSlug} />;
}
