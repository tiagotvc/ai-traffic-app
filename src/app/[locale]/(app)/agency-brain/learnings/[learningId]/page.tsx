import { LearningDetailPage } from "@/components/agency-brain/insights/LearningDetailPage";

export default async function LearningDetailRoute({
  params
}: {
  params: Promise<{ learningId: string }>;
}) {
  const { learningId } = await params;
  return <LearningDetailPage learningId={learningId} />;
}
