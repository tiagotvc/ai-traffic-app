import { Suspense } from "react";

import { NewCampaignView } from "@/uxpilot-ui/adapters/NewCampaignView";

export default function CampaignNewPage() {
  return (
    <Suspense fallback={null}>
      <NewCampaignView />
    </Suspense>
  );
}
