import {
  generateTrialLandingMetadata,
  TrialLandingFeaturePage,
  type TrialLandingSearchParams
} from "@/components/marketing/TrialLandingPage";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return generateTrialLandingMetadata("performance");
}

export default function PerformanceLandingPage({
  searchParams
}: {
  searchParams: TrialLandingSearchParams;
}) {
  return <TrialLandingFeaturePage feature="performance" searchParams={searchParams} />;
}
