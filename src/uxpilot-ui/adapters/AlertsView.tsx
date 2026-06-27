"use client";

import { AlertsContentLive } from "@/uxpilot-ui/adapters/AlertsContentLive";
import { UxPageMain } from "@/uxpilot-ui/adapters/UxPageMain";

export function AlertsView() {
  return (
    <UxPageMain gap="loose">
      <AlertsContentLive />
    </UxPageMain>
  );
}
