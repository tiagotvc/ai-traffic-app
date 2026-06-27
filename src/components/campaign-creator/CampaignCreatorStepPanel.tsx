"use client";

import type { ReactNode } from "react";

type Props = {
  stepKey: string;
  direction: "forward" | "back" | "none";
  children: ReactNode;
};

export function CampaignCreatorStepPanel({ stepKey, direction, children }: Props) {
  const animClass =
    direction === "forward"
      ? "animate-creator-step-forward"
      : direction === "back"
        ? "animate-creator-step-back"
        : "";

  return (
    <div key={stepKey} className={`campaign-creator-step-panel flex min-h-0 min-w-0 w-full flex-1 flex-col ${animClass}`.trim()}>
      {children}
    </div>
  );
}
