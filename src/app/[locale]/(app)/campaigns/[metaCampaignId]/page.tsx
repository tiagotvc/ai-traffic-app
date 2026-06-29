import { Suspense } from "react";

import { CampaignManagerClient } from "@/components/CampaignManagerClient";
import { NewCampaignView } from "@/uxpilot-ui/adapters/NewCampaignView";
import { RouteLoadingScreen } from "@/components/ui/RouteLoadingScreen";

export default async function CampaignOverviewPage({
  params,
  searchParams
}: {
  params: Promise<{ metaCampaignId: string }>;
  searchParams: Promise<{ client?: string }>;
}) {
  const { metaCampaignId } = await params;

  if (metaCampaignId === "new") {
    return (
      <Suspense fallback={<RouteLoadingScreen />}>
        <NewCampaignView />
      </Suspense>
    );
  }

  const { client } = await searchParams;
  return (
    <CampaignManagerClient
      metaCampaignId={metaCampaignId}
      clientSlug={client ?? ""}
      tab="overview"
    />
  );
}
