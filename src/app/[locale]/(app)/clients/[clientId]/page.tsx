import { ClientOverviewClient } from "@/components/ClientOverviewClient";

export default async function ClientPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  return <ClientOverviewClient clientId={clientId} />;
}
