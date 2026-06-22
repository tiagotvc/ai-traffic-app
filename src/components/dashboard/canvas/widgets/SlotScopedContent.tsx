"use client";

import { CompositeSlotContent } from "@/components/dashboard/canvas/widgets/CompositeSlotContent";
import { parseWidgetPeriod } from "@/lib/dashboard/widget-period";
import type { TaskbarSlot } from "@/lib/dashboard/taskbar-config";
import { useWidgetScopedDashboardData } from "@/uxpilot-ui/adapters/useWidgetScopedDashboardData";
import type { useDashboardData } from "@/uxpilot-ui/adapters/useDashboardData";

type DashboardData = ReturnType<typeof useDashboardData>;

export function SlotScopedContent({
  slot,
  data,
  compact
}: {
  slot: TaskbarSlot;
  data: DashboardData;
  compact: boolean;
}) {
  const periodPreset = parseWidgetPeriod(slot.config);
  const scoped = useWidgetScopedDashboardData(data, periodPreset);
  return <CompositeSlotContent slot={slot} data={scoped} compact={compact} />;
}
