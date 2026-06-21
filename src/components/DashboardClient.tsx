"use client";

import { DashboardView } from "@/uxpilot-ui/adapters/DashboardView";

export function DashboardClient({ initialAllowCanvas = false }: { initialAllowCanvas?: boolean }) {
  return <DashboardView initialAllowCanvas={initialAllowCanvas} />;
}

export { DashboardView };
