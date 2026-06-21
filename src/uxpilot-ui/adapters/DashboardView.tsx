"use client";

import { CommandStripBridgeProvider } from "@/uxpilot-ui/adapters/CommandStripBridge";
import { DashboardCanvasLive } from "@/uxpilot-ui/adapters/DashboardCanvasLive";
import { DashboardContentLive } from "@/uxpilot-ui/adapters/DashboardContentLive";
import { useEntitlementsCanvas } from "@/uxpilot-ui/adapters/useDashboardCanvas";

/** Production dashboard — V2 fixed layout or V3 canvas by plan. */
export function DashboardView({ initialAllowCanvas }: { initialAllowCanvas: boolean }) {
  const allowCanvas = useEntitlementsCanvas(initialAllowCanvas);

  return (
    <CommandStripBridgeProvider>
      {allowCanvas ? <DashboardCanvasLive /> : <DashboardContentLive />}
    </CommandStripBridgeProvider>
  );
}
