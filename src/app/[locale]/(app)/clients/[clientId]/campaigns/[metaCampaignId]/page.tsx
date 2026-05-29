import { redirect } from "next/navigation";

export default async function CampaignDetailPage({
  params
}: {
  params: Promise<{ clientId: string; metaCampaignId: string }>;
}) {
  const { clientId, metaCampaignId } = await params;
  redirect(`/campaigns/${metaCampaignId}?client=${encodeURIComponent(clientId)}`);
}
