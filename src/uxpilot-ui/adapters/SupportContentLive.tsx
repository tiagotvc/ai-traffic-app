"use client";

import { useCommandStripPage } from "@/components/layout/useCommandStripPage";
import SupportContent from "@/uxpilot-ui/pages/content/Support";

export function SupportContentLive() {
  useCommandStripPage({ hideFilters: true, hideSync: true });
  return <SupportContent />;
}
