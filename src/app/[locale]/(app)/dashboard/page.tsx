import { getAppContext } from "@/lib/app-context";
import { DashboardView } from "@/uxpilot-ui/adapters/DashboardView";

export default async function DashboardPage() {
  const { entitlements, platformAdmin } = await getAppContext();
  const initialAllowCanvas =
    platformAdmin || !!entitlements.limits.allowDashboardCanvas;

  return <DashboardView initialAllowCanvas={initialAllowCanvas} />;
}
