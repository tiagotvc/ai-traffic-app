import { Suspense } from "react";

import { NewCampaignView } from "@/uxpilot-ui/adapters/NewCampaignView";

export default function CampaignNewPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-[var(--text-dim)]">Carregando…</div>}>
      <NewCampaignView />
    </Suspense>
  );
}
