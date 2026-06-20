import type { ComponentType } from "react";
import { notFound } from "next/navigation";

import { UxThemeProvider } from "@/uxpilot-ui/adapters/ThemeProvider";

export const dynamic = "force-dynamic";

const SCREENS: Record<string, () => Promise<{ default: ComponentType }>> = {
  dashboard: () => import("@/uxpilot-ui/pages/Dashboard"),
  "agency-brain": () => import("@/uxpilot-ui/pages/AgencyBrain"),
  campaigns: () => import("@/uxpilot-ui/pages/Campaigns"),
  clients: () => import("@/uxpilot-ui/pages/Clients"),
  alerts: () => import("@/uxpilot-ui/pages/Alerts"),
  audiences: () => import("@/uxpilot-ui/pages/Audiences"),
  creatives: () => import("@/uxpilot-ui/pages/Creatives"),
  reports: () => import("@/uxpilot-ui/pages/Reports"),
  settings: () => import("@/uxpilot-ui/pages/Settings"),
  "new-campaign": () => import("@/uxpilot-ui/pages/NewCampaign"),
  support: () => import("@/uxpilot-ui/pages/Support"),
  about: () => import("@/uxpilot-ui/pages/About"),
  terms: () => import("@/uxpilot-ui/pages/Terms")
};

export default async function DesignPreviewPage({
  params
}: {
  params: Promise<{ screen: string }>;
}) {
  const { screen } = await params;
  const loader = SCREENS[screen];
  if (!loader) notFound();

  const mod = await loader();
  const Screen = mod.default;

  return (
    <UxThemeProvider>
      <div data-theme="light">
        <Screen />
      </div>
    </UxThemeProvider>
  );
}
