"use client";

import { CreativesContentLive } from "@/uxpilot-ui/adapters/CreativesContentLive";
import { UxPageMain } from "@/uxpilot-ui/adapters/UxPageMain";

export function CreativesView() {
  return (
    <div
      data-campaign-creator-shell
      className="app-shell-breakout flex min-h-0 flex-1 flex-col"
      style={{ background: "var(--surface-bg)" }}
    >
      <UxPageMain gap="loose" className="flex-1 overflow-y-auto">
        <CreativesContentLive />
      </UxPageMain>
    </div>
  );
}
