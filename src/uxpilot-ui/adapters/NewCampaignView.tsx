"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";

import { CampaignCreatorClient } from "@/components/campaign-creator/CampaignCreatorClient";
import { useCommandStripPage } from "@/components/layout/useCommandStripPage";

function NewCampaignContent() {
  const searchParams = useSearchParams();
  const client = searchParams.get("client") ?? undefined;
  const mode = searchParams.get("mode");
  const fromCampaign = searchParams.get("fromCampaign");
  const adset = searchParams.get("adset");

  useCommandStripPage({ hideFilters: true, hideSync: true });

  const initialAddAd = useMemo(
    () =>
      mode === "add-ad" && fromCampaign && adset
        ? { fromCampaignId: fromCampaign, adsetId: adset, clientSlug: client }
        : undefined,
    [mode, fromCampaign, adset, client]
  );

  return (
    <CampaignCreatorClient
      initialClientSlug={client}
      initialAddAd={initialAddAd}
      variant="uxpilot"
    />
  );
}

export function NewCampaignView() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-[var(--text-dim)]">Carregando…</div>}>
      <NewCampaignContent />
    </Suspense>
  );
}
