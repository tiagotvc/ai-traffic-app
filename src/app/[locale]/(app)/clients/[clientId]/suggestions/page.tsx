import { SuggestionsClient } from "@/components/suggestions/SuggestionsClient";

export default async function ClientSuggestionsPage({
  params
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  return <SuggestionsClient clientId={clientId} />;
}
