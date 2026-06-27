"use client";

import { ReportsClient } from "@/components/ReportsClient";
import { UxPageMain } from "@/uxpilot-ui/adapters/UxPageMain";

export function ReportsView() {
  return (
    <UxPageMain gap="loose">
      <ReportsClient />
    </UxPageMain>
  );
}
