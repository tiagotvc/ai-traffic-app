"use client";

import { ClientsContentLive } from "@/uxpilot-ui/adapters/ClientsContentLive";
import { UxPageMain } from "@/uxpilot-ui/adapters/UxPageMain";

export function ClientsView() {
  return (
    <UxPageMain gap="loose">
      <ClientsContentLive />
    </UxPageMain>
  );
}
