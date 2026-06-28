"use client";

import { Suspense, use } from "react";
import { useSearchParams } from "next/navigation";

import { CampaignCreatorClient } from "@/components/campaign-creator/CampaignCreatorClient";
import { NewCampaignView } from "@/uxpilot-ui/adapters/NewCampaignView";

function DraftContent({ draftId }: { draftId: string }) {
  const searchParams = useSearchParams();
  const startAtReview = searchParams.get("review") === "1";
  const activeParam = searchParams.get("active");
  const initialActiveNode =
    activeParam === "ad" ? "ad" : startAtReview ? "review" : undefined;

  return (
    <CampaignCreatorClient
      initialDraftId={draftId}
      initialActiveNode={initialActiveNode}
      variant="uxpilot"
    />
  );
}

function NewCampaignRouteContent({ draftId }: { draftId?: string }) {
  if (!draftId) {
    return <NewCampaignView />;
  }

  return (
    <Suspense fallback={<div className="p-6 text-sm text-[var(--text-dim)]">Carregando…</div>}>
      <DraftContent draftId={draftId} />
    </Suspense>
  );
}

export default function CampaignNewPage({
  params
}: {
  params: Promise<{ draftId?: string[] }>;
}) {
  const { draftId: draftIdSegments } = use(params);
  const draftId = draftIdSegments?.[0];

  return (
    <Suspense fallback={<div className="p-6 text-sm text-[var(--text-dim)]">Carregando…</div>}>
      <NewCampaignRouteContent draftId={draftId} />
    </Suspense>
  );
}
