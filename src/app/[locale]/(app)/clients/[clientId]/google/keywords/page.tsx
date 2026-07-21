import { GoogleKeywordsExplorerClient } from "@/components/GoogleKeywordsExplorerClient";

export default async function GoogleKeywordsPage({
  params
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  return <GoogleKeywordsExplorerClient clientId={clientId} />;
}
