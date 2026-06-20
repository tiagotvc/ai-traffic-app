"use client";

import { CommandStripBridgeProvider } from "@/uxpilot-ui/adapters/CommandStripBridge";
import { DashboardContentLive } from "@/uxpilot-ui/adapters/DashboardContentLive";

/** Production dashboard — UX Pilot layout with real API data. */
export function DashboardView() {
  return (
    <CommandStripBridgeProvider>
      <DashboardContentLive />
    </CommandStripBridgeProvider>
  );
}
