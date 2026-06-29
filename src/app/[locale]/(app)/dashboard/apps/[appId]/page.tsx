import { Suspense } from "react";
import { getAppContext } from "@/lib/app-context";
import { DashboardGridSkeleton } from "@/components/dashboard/canvas/DashboardGridSkeleton";
import { DashboardAppView } from "@/uxpilot-ui/adapters/DashboardAppView";

export default async function DashboardAppPage({
  params
}: {
  params: Promise<{ appId: string }>;
}) {
  const { appId } = await params;
  const { entitlements } = await getAppContext();
  const initialAllowCanvas = !!entitlements.limits.allowDashboardCanvas;

  return (
    <Suspense fallback={<DashboardGridSkeleton />}>
      <DashboardAppView appId={appId} initialAllowCanvas={initialAllowCanvas} />
    </Suspense>
  );
}
