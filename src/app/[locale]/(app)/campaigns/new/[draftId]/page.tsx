"use client";

import { Suspense, use } from "react";
import { useSearchParams } from "next/navigation";

import { CampaignCreatorClient } from "@/components/campaign-creator/CampaignCreatorClient";

function DraftContent({ draftId }: { draftId: string }) {
  const searchParams = useSearchParams();
  const startAtReview = searchParams.get("review") === "1";

  return (
    <CampaignCreatorClient
      initialDraftId={draftId}
      initialActiveNode={startAtReview ? "review" : undefined}
      variant="uxpilot"
    />
  );
}

export default function CampaignDraftPage({ params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = use(params);
  return (
    <Suspense fallback={<div className="p-6 text-sm text-[var(--text-dim)]">Carregando…</div>}>
      <DraftContent draftId={draftId} />
    </Suspense>
  );
}
