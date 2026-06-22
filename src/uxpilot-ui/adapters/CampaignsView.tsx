"use client";

import { CampaignsHubClient } from "@/components/CampaignsHubClient";
import { UxPageMain } from "@/uxpilot-ui/adapters/UxPageMain";

export function CampaignsView() {
  return (
    <UxPageMain className="space-y-5">
      <CampaignsHubClient useUxChrome />
    </UxPageMain>
  );
}
