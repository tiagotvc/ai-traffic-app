import {
  generateTrialLandingMetadata,
  TrialLandingFeaturePage,
  type TrialLandingSearchParams
} from "@/components/marketing/TrialLandingPage";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return generateTrialLandingMetadata("cockpit");
}

export default function CockpitLandingPage({
  searchParams
}: {
  searchParams: TrialLandingSearchParams;
}) {
  return <TrialLandingFeaturePage feature="cockpit" searchParams={searchParams} />;
}
