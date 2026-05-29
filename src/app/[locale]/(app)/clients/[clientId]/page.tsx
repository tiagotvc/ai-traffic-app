import { ClientDetailClient } from "@/components/ClientDetailClient";

export default async function ClientPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  return <ClientDetailClient clientId={clientId} />;
}
