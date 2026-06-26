import type { ReactNode } from "react";

const variants = {
  success: "bg-[rgba(16,185,129,0.12)] text-[var(--success)] border-[rgba(16,185,129,0.25)]",
  warning: "bg-[rgba(245,166,35,0.12)] text-[var(--amber)] border-[rgba(245,166,35,0.25)]",
  danger: "bg-[rgba(239,68,68,0.12)] text-[var(--danger)] border-[rgba(239,68,68,0.25)]",
  neutral: "bg-[var(--surface-thead)] text-[var(--text-dim)] border-[var(--border-color)]",
  brand: "bg-[rgba(79,70,229,0.12)] text-[var(--violet)] border-[rgba(79,70,229,0.25)]",
  accent:
    "border-[color-mix(in_srgb,var(--ui-accent)_35%,var(--border-color))] bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]"
} as const;

export function Badge({
  children,
  variant = "neutral"
}: {
  children: ReactNode;
  variant?: keyof typeof variants;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${variants[variant]}`}
    >
      {children}
    </span>
  );
}
