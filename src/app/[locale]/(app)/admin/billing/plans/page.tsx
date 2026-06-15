import { Suspense } from "react";

import { AdminPlansClient } from "@/components/billing/AdminPlansClient";
import { AdminPlansSkeleton } from "@/components/billing/BillingSkeletons";
import { listAdminPlans } from "@/lib/billing/admin-plans";

async function AdminPlansContent() {
  const plans = await listAdminPlans();
  return <AdminPlansClient initialPlans={plans} />;
}

export default function AdminPlansPage() {
  return (
    <Suspense fallback={<AdminPlansSkeleton />}>
      <AdminPlansContent />
    </Suspense>
  );
}
