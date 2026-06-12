import { Suspense } from "react";

import { BillingPortalClient } from "@/components/billing/BillingPortalClient";
import { BillingPortalSkeleton } from "@/components/billing/BillingSkeletons";

function BillingPortalFallback() {
  return <BillingPortalSkeleton />;
}

export default function BillingPage() {
  return (
    <Suspense fallback={<BillingPortalFallback />}>
      <BillingPortalClient />
    </Suspense>
  );
}
