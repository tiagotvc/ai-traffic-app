"use client";

import { BrainLearningsPage } from "@/components/agency-brain/insights/BrainFeedPage";
import { UxPageMain } from "@/uxpilot-ui/adapters/UxPageMain";

/** Agency Brain feed — real API data, UX Pilot page shell. */
export function AgencyBrainView() {
  return (
    <UxPageMain>
      <BrainLearningsPage />
    </UxPageMain>
  );
}
