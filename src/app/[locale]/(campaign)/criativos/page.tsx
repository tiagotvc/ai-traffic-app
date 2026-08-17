import {
  generateTrialLandingMetadata,
  TrialLandingFeaturePage,
  type TrialLandingSearchParams
} from "../teste/page";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return generateTrialLandingMetadata("criativos");
}

export default function CreativesLandingPage({
  searchParams
}: {
  searchParams: TrialLandingSearchParams;
}) {
  return <TrialLandingFeaturePage feature="criativos" searchParams={searchParams} />;
}
