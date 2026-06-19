import { HypothesisDetailPage } from "@/components/agency-brain/insights/HypothesisDetailPage";

export default async function HypothesisDetailRoute({
  params
}: {
  params: Promise<{ hypothesisId: string }>;
}) {
  const { hypothesisId } = await params;
  return <HypothesisDetailPage hypothesisId={hypothesisId} />;
}
