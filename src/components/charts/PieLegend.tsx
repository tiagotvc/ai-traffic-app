"use client";

import { cn } from "@/lib/cn";

export type PieLegendItem = { name: string; color: string };

export function PieLegend({
  items,
  className,
  position = "bottom"
}: {
  items: PieLegendItem[];
  className?: string;
  position?: "top" | "bottom" | "left" | "right";
}) {
  if (!items.length) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap gap-x-3 gap-y-1.5 px-1",
        position === "bottom" || position === "top" ? "justify-center" : "flex-col",
        position === "top" ? "mb-2" : "mt-2",
        className
      )}
    >
      {items.map((item, i) => (
        <div key={`${item.name}-${i}`} className="flex max-w-[200px] items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.color }} />
          <span className="truncate text-[10px] text-[var(--text-dim)]">{item.name}</span>
        </div>
      ))}
    </div>
  );
}
