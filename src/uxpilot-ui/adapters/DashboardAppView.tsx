"use client";

import { CommandStripBridgeProvider } from "@/uxpilot-ui/adapters/CommandStripBridge";
import { DashboardCanvasLive } from "@/uxpilot-ui/adapters/DashboardCanvasLive";
import { ViewsPlanUpsell } from "@/components/dashboard/canvas/ViewsPlanUpsell";
import { useEntitlementsCanvas } from "@/uxpilot-ui/adapters/useDashboardCanvas";

/** Single app canvas — opened from the apps gallery. */
export function DashboardAppView({
  appId,
  initialAllowCanvas
}: {
  appId: string;
  initialAllowCanvas: boolean;
}) {
  const allowCanvas = useEntitlementsCanvas(initialAllowCanvas);

  return (
    <CommandStripBridgeProvider>
      {allowCanvas ? (
        <DashboardCanvasLive appId={appId} />
      ) : (
        <ViewsPlanUpsell />
      )}
    </CommandStripBridgeProvider>
  );
}
