"use client";

import { useState } from "react";

import { PlanCard, type PlanCardData } from "@/components/billing/PlanLimitsCard";
import { cn } from "@/lib/cn";

/** Plan cards stacked vertically — selected plan highlighted in front. */
export function BillingPlansCarousel({
  plans,
  cycle,
  variant = "marketing",
  defaultSelectedSlug = "advanced"
}: {
  plans: PlanCardData[];
  cycle: "monthly" | "yearly";
  variant?: "portal" | "marketing";
  defaultSelectedSlug?: string;
}) {
  const [selectedSlug, setSelectedSlug] = useState(
    () => plans.find((p) => p.slug === defaultSelectedSlug)?.slug ?? plans[0]?.slug ?? "advanced"
  );

  if (!plans.length) return null;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      {plans.map((plan) => {
        const isSelected = plan.slug === selectedSlug;

        return (
          <div
            key={plan.id}
            role="button"
            tabIndex={0}
            onClick={() => setSelectedSlug(plan.slug)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setSelectedSlug(plan.slug);
              }
            }}
            className={cn(
              "relative w-full cursor-pointer rounded-2xl transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50",
              isSelected ? "z-20 scale-[1.02]" : "z-0 scale-[0.98] opacity-80 hover:opacity-95"
            )}
          >
            <div
              className={cn(
                "rounded-2xl transition-shadow duration-300",
                isSelected
                  ? "shadow-xl shadow-violet-900/30 ring-2 ring-violet-400/45 ring-offset-2 ring-offset-[#0a0f14]"
                  : "ring-1 ring-transparent hover:ring-white/10"
              )}
            >
              <PlanCard plan={plan} cycle={cycle} featured={isSelected} variant={variant} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
