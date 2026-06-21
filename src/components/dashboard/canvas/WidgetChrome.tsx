"use client";

import { GripVertical, X } from "lucide-react";

export function WidgetChrome({
  title,
  editMode,
  onRemove,
  children
}: {
  title?: string | null;
  editMode: boolean;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col">
      {editMode || title ? (
        <div
          className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2"
          style={{ borderColor: "var(--border-color)" }}
        >
          <div className="flex min-w-0 items-center gap-2">
            {editMode ? (
              <span className="widget-drag-handle cursor-grab active:cursor-grabbing" aria-hidden>
                <GripVertical size={14} style={{ color: "var(--text-dimmer)" }} />
              </span>
            ) : null}
            {title ? (
              <span className="truncate text-xs font-semibold" style={{ color: "var(--text-dim)" }}>
                {title}
              </span>
            ) : null}
          </div>
          {editMode ? (
            <button
              type="button"
              onClick={onRemove}
              className="rounded p-1 transition-colors hover:bg-[var(--surface-bg)]"
              aria-label="Remove widget"
            >
              <X size={14} style={{ color: "var(--text-dimmer)" }} />
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-hidden p-3">{children}</div>
    </div>
  );
}
