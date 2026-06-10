import { CampaignCreativesClient } from "@/components/CampaignCreativesClient";

export default async function CampaignCreativesPage({
  params,
  searchParams
}: {
  params: Promise<{ metaCampaignId: string }>;
  searchParams: Promise<{ client?: string }>;
}) {
  const { metaCampaignId } = await params;
  const { client } = await searchParams;
  return <CampaignCreativesClient metaCampaignId={metaCampaignId} clientSlug={client ?? ""} />;
}
