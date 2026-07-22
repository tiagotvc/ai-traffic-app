import { Suspense } from "react";

import { CampaignsView } from "@/uxpilot-ui/adapters/CampaignsView";
import { MetaNavBar } from "@/components/campaign/MetaNavBar";

export default function CampaignsPage() {
  return (
    <Suspense fallback={null}>
      <MetaNavBar />
      <CampaignsView />
    </Suspense>
  );
}
