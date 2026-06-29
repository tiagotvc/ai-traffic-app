"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo } from "react";

import { AiCampaignWizardClient } from "@/components/campaign-creator/AiCampaignWizardClient";
import { CampaignCreationModePicker } from "@/components/campaign-creator/CampaignCreationModePicker";
import { CampaignCreatorClient } from "@/components/campaign-creator/CampaignCreatorClient";
import { usePlatformFeature } from "@/hooks/usePlatformFeature";
import { useRouter } from "@/i18n/navigation";
import { useCommandStripPage } from "@/components/layout/useCommandStripPage";
import {
  clearCommittedCreationMode,
  commitCreationMode,
  readCommittedCreationMode
} from "@/lib/campaign-creator/creation-flow-session";

function shouldShowModePicker(mode: string | null, fromCampaign: string | null) {
  if (mode === "ai" || mode === "add-ad" || mode === "add-adset" || mode === "manual") {
    return false;
  }
  if (fromCampaign) return false;
  if (readCommittedCreationMode()) return false;
  return true;
}

function NewCampaignContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const aiGenerateEnabled = usePlatformFeature("campaigns.ai-generate");
  const client = searchParams.get("client") ?? undefined;
  const modeParam = searchParams.get("mode");
  const fromCampaign = searchParams.get("fromCampaign");
  const adset = searchParams.get("adset");
  const mode = modeParam ?? readCommittedCreationMode();

  useEffect(() => {
    if (modeParam === "ai" || modeParam === "manual" || modeParam === "add-ad" || modeParam === "add-adset") {
      commitCreationMode(modeParam);
    }
  }, [modeParam]);

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
        onClose={() => {
          clearCommittedCreationMode();
          router.push("/campaigns");
        }}
        clientSlug={client}
      />
    );
  }

  if (mode === "ai") {
    if (!aiGenerateEnabled) return null;
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
