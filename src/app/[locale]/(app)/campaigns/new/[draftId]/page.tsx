"use client";

import { use } from "react";

import { CampaignCreatorClient } from "@/components/campaign-creator/CampaignCreatorClient";

export default function CampaignDraftPage({ params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = use(params);
  return <CampaignCreatorClient initialDraftId={draftId} />;
}
