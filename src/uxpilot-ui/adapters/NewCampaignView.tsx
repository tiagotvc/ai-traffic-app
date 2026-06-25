"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";

import { AiCampaignWizardClient } from "@/components/campaign-creator/AiCampaignWizardClient";
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

  const initialAddAdset = useMemo(
    () =>
      mode === "add-adset" && fromCampaign
        ? { fromCampaignId: fromCampaign, clientSlug: client }
        : undefined,
    [mode, fromCampaign, client]
  );

  if (mode === "ai") {
    return <AiCampaignWizardClient initialClientSlug={client} />;
  }

  return (
    <CampaignCreatorClient
      initialClientSlug={client}
      initialAddAd={initialAddAd}
      initialAddAdset={initialAddAdset}
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
