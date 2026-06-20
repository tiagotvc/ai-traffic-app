import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";
import type { DsBadgeTone } from "@/design-system/tokens";

const toneClass: Record<DsBadgeTone, string> = {
  success: "bg-[rgba(16,185,129,0.12)] text-[var(--success)] border-[rgba(16,185,129,0.25)]",
  warning: "bg-[rgba(245,166,35,0.12)] text-[var(--amber)] border-[rgba(245,166,35,0.25)]",
  danger: "bg-[rgba(239,68,68,0.12)] text-[var(--danger)] border-[rgba(239,68,68,0.25)]",
  info: "bg-[rgba(79,70,229,0.12)] text-[var(--violet)] border-[rgba(79,70,229,0.25)]",
  beta: "bg-[rgba(124,58,237,0.15)] text-[#a78bfa] border-[rgba(124,58,237,0.35)]",
  amber: "bg-[rgba(245,166,35,0.15)] text-[var(--amber)] border-[rgba(245,166,35,0.3)]",
  neutral: "bg-[var(--surface-thead)] text-[var(--text-dim)] border-[var(--border-color)]"
};

type DsBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  tone?: DsBadgeTone;
  size?: "xs" | "sm";
};

export function DsBadge({
  children,
  className,
  tone = "neutral",
  size = "sm",
  ...props
}: DsBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-[11px]",
        toneClass[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
