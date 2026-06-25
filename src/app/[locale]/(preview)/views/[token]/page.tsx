import { ClientViewCanvas } from "@/components/dashboard/canvas/ClientViewCanvas";

export default async function ClientViewPage({
  params
}: {
  params: Promise<{ token: string; locale: string }>;
}) {
  const { token } = await params;
  return <ClientViewCanvas token={token} />;
}
