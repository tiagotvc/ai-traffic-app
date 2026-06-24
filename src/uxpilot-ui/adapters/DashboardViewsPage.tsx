"use client";

import { CommandStripBridgeProvider } from "@/uxpilot-ui/adapters/CommandStripBridge";
import { DashboardAppsHome } from "@/uxpilot-ui/adapters/DashboardAppsHome";

/** Custom views gallery and builder entry — gated create by plan. */
export function DashboardViewsPage({ initialAllowCanvas }: { initialAllowCanvas: boolean }) {
  return (
    <CommandStripBridgeProvider>
      <DashboardAppsHome initialAllowCanvas={initialAllowCanvas} />
    </CommandStripBridgeProvider>
  );
}
