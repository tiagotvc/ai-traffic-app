import { cn } from "@/lib/cn";

/** Divisória horizontal entre seções flat (sem card wrapper). */
export function DsFlatDivider({ className }: { className?: string } = {}) {
  return <div className={cn("border-t border-[var(--border-color)]", className)} />;
}
