"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { CampaignCreatorClient } from "@/components/campaign-creator/CampaignCreatorClient";

export default function CampaignNewPage() {
  const searchParams = useSearchParams();
  const client = searchParams.get("client") ?? undefined;
  const mode = searchParams.get("mode");
  const fromCampaign = searchParams.get("fromCampaign");
  const adset = searchParams.get("adset");

  const initialAddAd = useMemo(
    () =>
      mode === "add-ad" && fromCampaign && adset
        ? { fromCampaignId: fromCampaign, adsetId: adset, clientSlug: client }
        : undefined,
    [mode, fromCampaign, adset, client]
  );

  return (
    <CampaignCreatorClient initialClientSlug={client} initialAddAd={initialAddAd} />
  );
}
