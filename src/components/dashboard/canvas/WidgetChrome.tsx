"use client";

import { GripVertical, X } from "lucide-react";

import { cn } from "@/lib/cn";

export function WidgetChrome({
  title,
  editMode,
  onRemove,
  children,
  compact = false,
  periodBadge
}: {
  title?: string | null;
  editMode: boolean;
  onRemove: () => void;
  children: React.ReactNode;
  /** Tighter padding for small metric widgets. */
  compact?: boolean;
  periodBadge?: string;
}) {
  const showTitleBar = (!!title || !!periodBadge) && !editMode;

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col">
      {editMode ? (
        <>
          <div
            className="widget-drag-handle absolute inset-x-0 top-0 z-[2] h-8 cursor-grab active:cursor-grabbing"
            aria-hidden
          />
          <button
            type="button"
            onClick={onRemove}
            className="absolute right-1.5 top-1.5 z-[3] rounded-md p-1 transition-colors hover:bg-[var(--surface-bg)]"
            aria-label="Remove widget"
          >
            <X size={14} style={{ color: "var(--text-dimmer)" }} />
          </button>
          <span
            className="widget-drag-handle absolute left-1.5 top-1.5 z-[3] cursor-grab rounded-md p-1 active:cursor-grabbing"
            aria-hidden
          >
            <GripVertical size={14} style={{ color: "var(--text-dimmer)" }} />
          </span>
        </>
      ) : null}

      {showTitleBar ? (
        <div
          className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2"
          style={{ borderColor: "var(--border-color)" }}
        >
          {title ? (
            <span className="truncate text-xs font-semibold" style={{ color: "var(--text-dim)" }}>
              {title}
            </span>
          ) : (
            <span />
          )}
          {periodBadge ? (
            <span
              className="shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
              style={{ background: "rgba(99,102,241,0.12)", color: "var(--violet-bright)" }}
            >
              {periodBadge}
            </span>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          "flex min-h-0 w-full flex-1 overflow-hidden",
          compact
            ? editMode
              ? "p-1.5 pt-6"
              : "p-2"
            : editMode
              ? "p-3 pt-7"
              : "p-3",
          !compact && editMode && "flex flex-col"
        )}
      >
        {children}
      </div>
    </div>
  );
}
