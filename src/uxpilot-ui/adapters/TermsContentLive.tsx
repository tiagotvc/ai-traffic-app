"use client";

import { useCommandStripPage } from "@/components/layout/useCommandStripPage";
import TermsContent from "@/uxpilot-ui/pages/content/Terms";

export function TermsContentLive() {
  useCommandStripPage({ hideFilters: true, hideSync: true });
  return <TermsContent />;
}
