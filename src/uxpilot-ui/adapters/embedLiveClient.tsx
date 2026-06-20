"use client";

import type { ComponentType, ReactNode } from "react";

import { UxPageMain } from "@/uxpilot-ui/adapters/UxPageMain";

/** Wraps an existing *Client with UX Pilot page chrome — real data, no mocks. */
export function embedLiveClient(
  Client: ComponentType,
  options?: { className?: string; before?: ReactNode }
) {
  return function EmbeddedLiveView() {
    return (
      <UxPageMain className={options?.className}>
        {options?.before}
        <Client />
      </UxPageMain>
    );
  };
}
