import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

type DsCardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  /** Subtle hover lift for KPI/interactive cards */
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
};

const paddingClass = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-5"
} as const;

export function DsCard({
  children,
  className,
  hover = false,
  padding = "md",
  ...props
}: DsCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-[var(--surface-card)] shadow-sm",
        "border-[var(--border-color)]",
        paddingClass[padding],
        hover && "kpi-card-hover",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
