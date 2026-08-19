import {
  generateTrialLandingMetadata,
  TrialLandingFeaturePage,
  type TrialLandingSearchParams
} from "@/components/marketing/TrialLandingPage";
import { resolvePerformanceFeature } from "@/lib/marketing/trial-landing-variants";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: TrialLandingSearchParams }) {
  const params = await searchParams;
  return generateTrialLandingMetadata(resolvePerformanceFeature(params.feature));
}

export default async function PerformanceLandingPage({
  searchParams
}: {
  searchParams: TrialLandingSearchParams;
}) {
  const params = await searchParams;
  return (
    <TrialLandingFeaturePage
      feature={resolvePerformanceFeature(params.feature)}
      searchParams={searchParams}
    />
  );
}
