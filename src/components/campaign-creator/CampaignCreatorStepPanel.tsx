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
    <div key={stepKey} className={animClass}>
      {children}
    </div>
  );
}
