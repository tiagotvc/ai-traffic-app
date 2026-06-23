"use client";

import { cn } from "@/lib/cn";

export function PremiumChartFrame({
  children,
  className,
  compact = false
}: {
  children: React.ReactNode;
  className?: string;
  /** Canvas/widgets — skip outer frame padding */
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        compact ? "h-full min-h-0 w-full min-w-0" : "premium-chart-frame h-full min-h-0 w-full min-w-0",
        className
      )}
    >
      {children}
    </div>
  );
}
