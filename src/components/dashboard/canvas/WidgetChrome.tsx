"use client";

import { GripVertical, Settings2, X } from "lucide-react";

import { cn } from "@/lib/cn";

export function WidgetChrome({
  title,
  editMode,
  onRemove,
  onConfigure,
  children,
  compact = false,
  embedded = false,
  periodBadge,
  fitContent = false,
  bare = false,
  fillHeight = false,
  selected = false,
  onSelect,
  allowRemove = true,
  overlayEditChrome = false
}: {
  title?: string | null;
  editMode: boolean;
  onRemove: () => void;
  onConfigure?: () => void;
  children: React.ReactNode;
  compact?: boolean;
  embedded?: boolean;
  periodBadge?: string;
  fitContent?: boolean;
  /** View mode — sem padding extra do chrome (conteúdo usa o próprio card). */
  bare?: boolean;
  /** Card preenche 100% da célula (widgets embedded como alertas). */
  fillHeight?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  allowRemove?: boolean;
  /** Destaques organize — drag overlay sem reservar altura (pt-6/pt-7). */
  overlayEditChrome?: boolean;
}) {
  const showTitleBar = !embedded && (!!title || !!periodBadge) && !editMode;
  const useEditBar = editMode && embedded && !overlayEditChrome;
  const useOverlayEdit = editMode && overlayEditChrome;

  return (
    <div
      className={cn(
        "relative flex w-full flex-col",
        fillHeight || (!fitContent && !compact) ? "h-full min-h-0" : "h-auto",
        selected && editMode && "ring-2 ring-[rgba(124,58,237,0.55)] ring-offset-1 ring-offset-[var(--surface-bg)]"
      )}
      onClick={
        editMode && onSelect
          ? (e) => {
              e.stopPropagation();
              onSelect();
            }
          : undefined
      }
    >
      {editMode && !useEditBar ? (
        <>
          <div
            className={cn(
              "widget-drag-handle absolute inset-x-0 top-0 z-[2] cursor-grab active:cursor-grabbing",
              useOverlayEdit ? "h-6" : "h-8"
            )}
            aria-hidden
          />
          {allowRemove ? (
            <button
              type="button"
              onClick={onRemove}
              className="absolute right-1.5 top-1.5 z-[3] rounded-md p-1 transition-colors hover:bg-[var(--surface-bg)]"
              aria-label="Remove widget"
            >
              <X size={14} style={{ color: "var(--text-dimmer)" }} />
            </button>
          ) : null}
          {onConfigure ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onConfigure();
              }}
              className="absolute right-8 top-1.5 z-[3] rounded-md p-1 transition-colors hover:bg-[var(--surface-bg)]"
              aria-label="Configure widget"
            >
              <Settings2 size={14} style={{ color: "var(--text-dimmer)" }} />
            </button>
          ) : null}
          <span
            className="widget-drag-handle absolute left-1.5 top-1.5 z-[3] cursor-grab rounded-md p-1 active:cursor-grabbing"
            aria-hidden
          >
            <GripVertical size={14} style={{ color: "var(--text-dimmer)" }} />
          </span>
        </>
      ) : null}

      {useEditBar ? (
        <div
          className="widget-edit-bar widget-drag-handle relative z-[2] flex h-7 shrink-0 cursor-grab items-center justify-between px-1 active:cursor-grabbing"
          style={{
            borderBottomWidth: 1,
            borderBottomStyle: "solid",
            borderBottomColor: "var(--border-color)",
            background: "var(--surface-thead)"
          }}
        >
          <span className="widget-drag-handle flex cursor-grab items-center rounded p-0.5 active:cursor-grabbing">
            <GripVertical size={14} style={{ color: "var(--text-dimmer)" }} />
          </span>
          <button
            type="button"
            onClick={onRemove}
            className="rounded p-0.5 transition-colors hover:bg-[var(--surface-bg)]"
            aria-label="Remove widget"
          >
            <X size={14} style={{ color: "var(--text-dimmer)" }} />
          </button>
        </div>
      ) : null}

      {showTitleBar ? (
        <div
          className="flex shrink-0 items-center justify-between gap-2 px-3 py-2"
          style={{
            borderBottomWidth: 1,
            borderBottomStyle: "solid",
            borderBottomColor: "var(--border-color)"
          }}
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
          "flex min-h-0 w-full flex-col max-lg:h-auto max-lg:flex-none",
          fitContent || compact ? "overflow-visible" : "flex-1 overflow-hidden max-lg:overflow-visible",
          bare || fillHeight
            ? "p-0"
            : embedded
              ? overlayEditChrome
                ? "p-0"
                : "p-2"
              : compact
                ? "p-1.5"
                : editMode && !overlayEditChrome
                  ? "p-3 pt-7"
                  : "p-3"
        )}
      >
        {children}
      </div>
    </div>
  );
}
