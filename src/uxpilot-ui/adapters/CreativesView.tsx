"use client";

import { CreativesContentLive } from "@/uxpilot-ui/adapters/CreativesContentLive";
import { UxPageMain } from "@/uxpilot-ui/adapters/UxPageMain";

export function CreativesView() {
  return (
    <UxPageMain gap="loose">
      <CreativesContentLive />
    </UxPageMain>
  );
}
