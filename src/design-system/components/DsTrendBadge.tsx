import { cn } from "@/lib/cn";
import type { DsTrendDirection } from "@/design-system/tokens";

type DsTrendBadgeProps = {
  change: string;
  direction: DsTrendDirection;
  /** When true, "up" is good (green). When false, "up" is bad (red) — e.g. cost metrics. */
  goodWhenUp?: boolean;
  small?: boolean;
  className?: string;
};

export function DsTrendBadge({
  change,
  direction,
  goodWhenUp = true,
  small = false,
  className
}: DsTrendBadgeProps) {
  const isUp = direction === "up";
  const isNeutral = direction === "neutral";

  let color = "#94a3b8";
  if (!isNeutral) {
    const positive = goodWhenUp ? isUp : !isUp;
    color = positive ? "var(--success)" : "var(--danger)";
  }

  const arrow = isNeutral ? "—" : isUp ? "▲" : "▼";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded font-medium tabular-nums",
        small ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
        className
      )}
      style={{ background: `${color}15`, color }}
    >
      <span className="leading-none">{arrow}</span>
      {change}
    </span>
  );
}
