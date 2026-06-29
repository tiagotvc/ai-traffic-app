import { getAppContext } from "@/lib/app-context";
import { DashboardViewsPage } from "@/uxpilot-ui/adapters/DashboardViewsPage";

export default async function DashboardViewsRoutePage() {
  const { entitlements } = await getAppContext();
  const initialAllowCanvas = !!entitlements.limits.allowDashboardCanvas;

  return <DashboardViewsPage initialAllowCanvas={initialAllowCanvas} />;
}
