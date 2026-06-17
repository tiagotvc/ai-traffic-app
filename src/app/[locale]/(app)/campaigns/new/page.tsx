"use client";

import { useSearchParams } from "next/navigation";

import { CampaignCreatorClient } from "@/components/campaign-creator/CampaignCreatorClient";

export default function CampaignNewPage() {
  const searchParams = useSearchParams();
  const client = searchParams.get("client") ?? undefined;

  return <CampaignCreatorClient initialClientSlug={client} />;
}
