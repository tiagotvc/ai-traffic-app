import { CampaignManagerClient } from "@/components/CampaignManagerClient";

export default async function CampaignOverviewPage({
  params,
  searchParams
}: {
  params: Promise<{ metaCampaignId: string }>;
  searchParams: Promise<{ client?: string }>;
}) {
  const { metaCampaignId } = await params;
  const { client } = await searchParams;
  return (
    <CampaignManagerClient
      metaCampaignId={metaCampaignId}
      clientSlug={client ?? ""}
      tab="overview"
    />
  );
}
