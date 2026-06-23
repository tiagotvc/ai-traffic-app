"use client";

import { cn } from "@/lib/cn";

export function DashboardToolbarButton({
  icon,
  label,
  className,
  style,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-xs font-semibold transition sm:h-auto sm:w-auto sm:gap-2 sm:px-3 sm:py-2",
        className
      )}
      style={style}
      {...props}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
