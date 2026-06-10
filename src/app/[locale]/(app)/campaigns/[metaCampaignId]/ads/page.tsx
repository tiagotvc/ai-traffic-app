import { CampaignAdsClient } from "@/components/CampaignAdsClient";

export default async function CampaignAdsPage({
  params,
  searchParams
}: {
  params: Promise<{ metaCampaignId: string }>;
  searchParams: Promise<{ client?: string }>;
}) {
  const { metaCampaignId } = await params;
  const { client } = await searchParams;
  return <CampaignAdsClient metaCampaignId={metaCampaignId} clientSlug={client ?? ""} />;
}
