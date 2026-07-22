import { Suspense } from "react";

import { CampaignDrilldownProvider } from "@/components/campaign/CampaignDrilldownProvider";
import { MetaNavBar } from "@/components/campaign/MetaNavBar";

export default function CampaignDrilldownLayout({ children }: { children: React.ReactNode }) {
  return (
    <CampaignDrilldownProvider>
      <Suspense fallback={null}>
        <MetaNavBar />
      </Suspense>
      {children}
    </CampaignDrilldownProvider>
  );
}
