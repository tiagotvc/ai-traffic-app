"use client";

import { cn } from "@/lib/cn";
import { premiumTooltipContentStyle } from "@/lib/dashboard/premium-chart-theme";

export function PremiumChartTooltip({
  title,
  children,
  className
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl p-3 text-xs", className)} style={premiumTooltipContentStyle}>
      {title ? (
        <p className="mb-2 font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
          {title}
        </p>
      ) : null}
      {children}
    </div>
  );
}
