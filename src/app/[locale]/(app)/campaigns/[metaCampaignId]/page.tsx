import { Suspense } from "react";

import { CampaignManagerClient } from "@/components/CampaignManagerClient";
import { NewCampaignView } from "@/uxpilot-ui/adapters/NewCampaignView";

export default async function CampaignOverviewPage({
  params,
  searchParams
}: {
  params: Promise<{ metaCampaignId: string }>;
  searchParams: Promise<{ client?: string }>;
}) {
  const { metaCampaignId } = await params;

  if (metaCampaignId === "new") {
    return (
      <Suspense fallback={<div className="p-6 text-sm text-[var(--text-dim)]">Carregando…</div>}>
        <NewCampaignView />
      </Suspense>
    );
  }

  const { client } = await searchParams;
  return (
    <CampaignManagerClient
      metaCampaignId={metaCampaignId}
      clientSlug={client ?? ""}
      tab="overview"
    />
  );
}
