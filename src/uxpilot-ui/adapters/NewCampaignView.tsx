"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";

import { AiCampaignWizardClient } from "@/components/campaign-creator/AiCampaignWizardClient";
import { CampaignCreationModePicker } from "@/components/campaign-creator/CampaignCreationModePicker";
import { CampaignCreatorClient } from "@/components/campaign-creator/CampaignCreatorClient";
import { useRouter } from "@/i18n/navigation";
import { useCommandStripPage } from "@/components/layout/useCommandStripPage";

function shouldShowModePicker(mode: string | null, fromCampaign: string | null) {
  if (mode === "ai" || mode === "add-ad" || mode === "add-adset" || mode === "manual") {
    return false;
  }
  return !fromCampaign;
}

function NewCampaignContent() {
  const router = useRouter();
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

  if (shouldShowModePicker(mode, fromCampaign)) {
    return (
      <CampaignCreationModePicker
        open
        onClose={() => router.push("/campaigns")}
        clientSlug={client}
      />
    );
  }

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
