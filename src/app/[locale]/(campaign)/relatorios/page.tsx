import {
  generateTrialLandingMetadata,
  TrialLandingFeaturePage,
  type TrialLandingSearchParams
} from "../teste/page";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return generateTrialLandingMetadata("relatorios");
}

export default function ReportsLandingPage({
  searchParams
}: {
  searchParams: TrialLandingSearchParams;
}) {
  return <TrialLandingFeaturePage feature="relatorios" searchParams={searchParams} />;
}
