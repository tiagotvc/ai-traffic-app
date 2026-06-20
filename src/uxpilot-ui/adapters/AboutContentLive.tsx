"use client";

import { useCommandStripPage } from "@/components/layout/useCommandStripPage";
import AboutContent from "@/uxpilot-ui/pages/content/About";

export function AboutContentLive() {
  useCommandStripPage({ hideFilters: true, hideSync: true });
  return <AboutContent />;
}
