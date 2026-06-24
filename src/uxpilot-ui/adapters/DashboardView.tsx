"use client";

import { CommandStripBridgeProvider } from "@/uxpilot-ui/adapters/CommandStripBridge";
import { DashboardContentLive } from "@/uxpilot-ui/adapters/DashboardContentLive";

/** Production dashboard — highlights (read-only) at /dashboard; views at /dashboard/views. */
export function DashboardView({ initialAllowCanvas }: { initialAllowCanvas: boolean }) {
  void initialAllowCanvas;
  return (
    <CommandStripBridgeProvider>
      <DashboardContentLive readOnly />
    </CommandStripBridgeProvider>
  );
}
