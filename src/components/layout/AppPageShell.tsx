import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type AppPageShellProps = {
  children: ReactNode;
  /** Default `1.25rem` (`--app-section-gap`); loose uses `1.5rem`. */
  gap?: "default" | "loose";
  className?: string;
  /** Render as `<main>` for standalone pages; default is `<div>`. */
  as?: "div" | "main";
};

/**
 * Standard page content stack — section gaps only.
 * Horizontal padding is owned by `AppShellSkeleton` via `.app-shell-content`.
 */
export function AppPageShell({
  children,
  gap = "default",
  className,
  as: Tag = "div"
}: AppPageShellProps) {
  return (
    <Tag
      className={cn(
        "app-page-shell",
        gap === "loose" && "app-page-shell--loose",
        className
      )}
    >
      {children}
    </Tag>
  );
}
