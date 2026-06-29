"use client";

import { Suspense, use } from "react";
import { useSearchParams } from "next/navigation";

import { CampaignCreatorClient } from "@/components/campaign-creator/CampaignCreatorClient";
import { RouteLoadingScreen } from "@/components/ui/RouteLoadingScreen";

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

export default function CampaignDraftPage({ params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = use(params);
  return (
    <Suspense fallback={<RouteLoadingScreen />}>
      <DraftContent draftId={draftId} />
    </Suspense>
  );
}
