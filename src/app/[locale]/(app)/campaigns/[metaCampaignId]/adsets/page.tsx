import { CampaignAdSetsClient } from "@/components/CampaignAdSetsClient";

export default async function CampaignAdsetsPage({
  params,
  searchParams
}: {
  params: Promise<{ metaCampaignId: string }>;
  searchParams: Promise<{ client?: string }>;
}) {
  const { metaCampaignId } = await params;
  const { client } = await searchParams;
  return <CampaignAdSetsClient metaCampaignId={metaCampaignId} clientSlug={client ?? ""} />;
}
