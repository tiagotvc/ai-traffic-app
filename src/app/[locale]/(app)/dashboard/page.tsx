import { getAppContext } from "@/lib/app-context";
import { DashboardHighlightsPage } from "@/uxpilot-ui/adapters/DashboardHighlightsPage";

export default async function DashboardPage() {
  await getAppContext();
  return <DashboardHighlightsPage />;
}
