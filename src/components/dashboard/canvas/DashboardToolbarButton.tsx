"use client";

import { cn } from "@/lib/cn";

export function DashboardToolbarButton({
  icon,
  label,
  badge,
  className,
  style,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: React.ReactNode;
  label: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={cn(
        "relative flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold transition",
        "shadow-sm hover:shadow-md",
        className
      )}
      style={{
        background: "var(--surface-card)",
        borderColor: "var(--border-color)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        ...style
      }}
      {...props}
    >
      <span className="inline-flex shrink-0 [&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>
      <span className="max-w-[7.5rem] truncate whitespace-nowrap sm:max-w-[9.5rem]">{label}</span>
      {badge ? (
        <span
          className="absolute -right-1 -top-1 rounded px-1 py-px text-[7px] font-bold uppercase tracking-wide"
          style={{ background: "rgba(245,166,35,0.22)", color: "#f5a623" }}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}
