import { Suspense } from "react";

import { CampaignsHubClient } from "@/components/CampaignsHubClient";
import { TableSkeleton } from "@/components/ui/Skeleton";

export default function CampaignsPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={8} columns={["wide", "badge", "metric", "metric"]} />}>
      <CampaignsHubClient />
    </Suspense>
  );
}
