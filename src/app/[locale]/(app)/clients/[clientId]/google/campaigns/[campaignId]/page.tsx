import { GoogleCampaignDetailClient } from "@/components/GoogleCampaignDetailClient";

export default async function GoogleCampaignDetailPage({
  params
}: {
  params: Promise<{ clientId: string; campaignId: string }>;
}) {
  const { clientId, campaignId } = await params;
  return <GoogleCampaignDetailClient clientId={clientId} campaignId={campaignId} />;
}
