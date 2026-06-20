import { Suspense } from "react";

import { CampaignsView } from "@/uxpilot-ui/adapters/CampaignsView";

export default function CampaignsPage() {
  return (
    <Suspense fallback={null}>
      <CampaignsView />
    </Suspense>
  );
}
