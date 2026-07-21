import { GoogleAdGroupDetailClient } from "@/components/GoogleAdGroupDetailClient";

export default async function GoogleAdGroupDetailPage({
  params
}: {
  params: Promise<{ clientId: string; campaignId: string; adGroupId: string }>;
}) {
  const { clientId, campaignId, adGroupId } = await params;
  return (
    <GoogleAdGroupDetailClient
      clientId={clientId}
      campaignId={campaignId}
      adGroupId={adGroupId}
    />
  );
}
