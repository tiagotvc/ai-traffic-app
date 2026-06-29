import { Suspense } from "react";

import { NewCampaignView } from "@/uxpilot-ui/adapters/NewCampaignView";
import { RouteLoadingScreen } from "@/components/ui/RouteLoadingScreen";

export default function CampaignNewPage() {
  return (
    <Suspense fallback={<RouteLoadingScreen />}>
      <NewCampaignView />
    </Suspense>
  );
}
