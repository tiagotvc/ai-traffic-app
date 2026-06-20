"use client";

import { AudiencesLookalikeClient } from "@/components/AudiencesLookalikeClient";
import { UxPageMain } from "@/uxpilot-ui/adapters/UxPageMain";

export function AudiencesView() {
  return (
    <UxPageMain className="space-y-5">
      <AudiencesLookalikeClient useUxChrome />
    </UxPageMain>
  );
}
