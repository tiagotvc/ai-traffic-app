"use client";

import { Suspense, use } from "react";

import { CampaignCreatorClient } from "@/components/campaign-creator/CampaignCreatorClient";

function DraftContent({ draftId }: { draftId: string }) {
  return <CampaignCreatorClient initialDraftId={draftId} variant="uxpilot" />;
}

export default function CampaignDraftPage({ params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = use(params);
  return (
    <Suspense fallback={<div className="p-6 text-sm text-[var(--text-dim)]">Carregando…</div>}>
      <DraftContent draftId={draftId} />
    </Suspense>
  );
}
