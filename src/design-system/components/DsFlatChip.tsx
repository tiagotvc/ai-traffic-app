import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/** Chip com ícone — ex.: "+1 cliente", limites extras, pills de addon. */
export function DsFlatChip({
  icon,
  label,
  iconBackground = "var(--ui-accent-muted-strong)",
  iconColor = "var(--ui-accent)",
  className
}: {
  icon: ReactNode;
  label: string;
  iconBackground?: string;
  iconColor?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-card)] px-3 py-2.5 text-xs font-medium text-[var(--text-main)]",
        className
      )}
    >
      <span
        className="flex h-7 w-7 items-center justify-center rounded-lg"
        style={{ background: iconBackground, color: iconColor }}
      >
        {icon}
      </span>
      {label}
    </span>
  );
}
