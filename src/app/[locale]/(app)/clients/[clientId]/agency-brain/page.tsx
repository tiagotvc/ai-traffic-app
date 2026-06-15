import { AgencyBrainClient } from "@/components/agency-brain/AgencyBrainClient";

export default async function ClientAgencyBrainPage({
  params
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  return <AgencyBrainClient clientId={clientId} />;
}
