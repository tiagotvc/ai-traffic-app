import {
  generateTrialLandingMetadata,
  TrialLandingFeaturePage,
  type TrialLandingSearchParams
} from "@/components/marketing/TrialLandingPage";
import {
  performanceFeatureCanonical,
  resolvePerformanceFeature
} from "@/lib/marketing/trial-landing-variants";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: TrialLandingSearchParams }) {
  const params = await searchParams;
  const feature = resolvePerformanceFeature(params.feature);
  return generateTrialLandingMetadata(feature, {
    index: true,
    canonicalPath: performanceFeatureCanonical(feature)
  });
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
