"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BarChart3, Bell, GripVertical, LayoutGrid, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { SlotScopedContent } from "@/components/dashboard/canvas/widgets/SlotScopedContent";
import { cn } from "@/lib/cn";
import {
  COMPOSITE_SLOT_KINDS,
  createCompositeSlot,
  getSlotWeight,
  MAX_TASKBAR_SLOTS,
  setSlotWeight,
  slotLayoutStyle,
  slotKindFromWidgetType,
  type CompositeSlotKind,
  type TaskbarOrientation,
  type TaskbarSlot
} from "@/lib/dashboard/taskbar-config";
import type { useDashboardData } from "@/uxpilot-ui/adapters/useDashboardData";

type DashboardData = ReturnType<typeof useDashboardData>;

const SLOT_ICONS: Record<CompositeSlotKind, typeof LayoutGrid> = {
  metric: LayoutGrid,
  chart: BarChart3,
  alerts: Bell
};

function SlotResizeHandle({
  orientation,
  onResize
}: {
  orientation: TaskbarOrientation;
  onResize: (delta: number) => void;
}) {
  const isHorizontal = orientation === "horizontal";

  const onMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    let accumulated = 0;

    const onMove = (ev: MouseEvent) => {
      const delta = isHorizontal ? ev.movementX : ev.movementY;
      accumulated += delta;
      if (Math.abs(accumulated) >= 28) {
        const steps = Math.trunc(accumulated / 28);
        onResize(steps);
        accumulated -= steps * 28;
      }
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div
      role="separator"
      onMouseDown={onMouseDown}
      className={cn(
        "z-20 flex shrink-0 cursor-col-resize items-center justify-center opacity-0 transition-opacity group-hover/slot:opacity-100",
        isHorizontal
          ? "absolute -right-1.5 top-1 bottom-1 w-3"
          : "absolute -bottom-1.5 left-1 right-1 h-3 cursor-row-resize"
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-md",
          isHorizontal ? "h-full w-1.5" : "h-1.5 w-full"
        )}
        style={{ background: "rgba(99,102,241,0.35)" }}
      >
        <GripVertical size={10} className={cn("text-indigo-400", !isHorizontal && "rotate-90")} />
      </div>
    </div>
  );
}

function AddSlotMenu({
  open,
  anchorRef,
  onClose,
  onPick
}: {
  open: boolean;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onPick: (kind: CompositeSlotKind) => void;
}) {
  const t = useTranslations("dashboardWidgets");
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 6, left: rect.left });
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const close = () => onClose();
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open, onClose]);

  if (!open || !pos || typeof document === "undefined") return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[200]" onClick={onClose} aria-hidden />
      <div
        className="fixed z-[201] min-w-[160px] overflow-hidden rounded-xl border py-1 shadow-2xl"
        style={{
          top: pos.top,
          left: pos.left,
          background: "var(--surface-card)",
          borderColor: "var(--border-color)"
        }}
      >
        {COMPOSITE_SLOT_KINDS.map((kind) => {
          const Icon = SLOT_ICONS[kind];
          return (
            <button
              key={kind}
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs transition-colors hover:bg-[var(--surface-bg)]"
              style={{ color: "var(--text-main)" }}
              onClick={() => onPick(kind)}
            >
              <Icon size={14} className="shrink-0 text-indigo-400" />
              {t(`compositeSlot_${kind}`)}
            </button>
          );
        })}
      </div>
    </>,
    document.body
  );
}

export function TaskbarWidget({
  data,
  orientation,
  slots,
  preview = false,
  onSlotsChange,
  selectedSlotId,
  onSelectSlot,
  hideAddButton = false
}: {
  data: DashboardData;
  orientation: TaskbarOrientation;
  slots: TaskbarSlot[];
  preview?: boolean;
  onSlotsChange?: (slots: TaskbarSlot[]) => void;
  selectedSlotId?: string | null;
  onSelectSlot?: (id: string | null) => void;
  hideAddButton?: boolean;
}) {
  const t = useTranslations("dashboardWidgets");
  const isHorizontal = orientation === "horizontal";
  const compact = isHorizontal;
  const editable = preview && !!onSlotsChange;
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const addBtnRef = useRef<HTMLButtonElement>(null);

  const addSlot = (kind: CompositeSlotKind) => {
    if (!onSlotsChange || slots.length >= MAX_TASKBAR_SLOTS) return;
    const next = createCompositeSlot(kind, orientation);
    onSlotsChange([...slots, next]);
    onSelectSlot?.(next.id);
    setAddMenuOpen(false);
  };

  const removeSlot = (id: string) => {
    if (!onSlotsChange) return;
    onSlotsChange(slots.filter((s) => s.id !== id));
    if (selectedSlotId === id) onSelectSlot?.(null);
  };

  return (
    <div
      className={cn(
        "w-full rounded-xl border border-dashed p-2",
        isHorizontal ? "flex min-h-[220px] flex-row items-stretch gap-1" : "flex min-h-[280px] flex-col gap-1"
      )}
      style={{
        borderColor: "var(--border-color)",
        background: "rgba(79,70,229,0.03)"
      }}
    >
      {slots.map((slot, index) => {
        const layout = slotLayoutStyle(slot, orientation);
        const selected = selectedSlotId === slot.id;
        const canResize = editable && index < slots.length - 1;

        return (
          <div
            key={slot.id}
            className={cn(
              "group/slot relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border transition-all",
              layout.className,
              editable && "cursor-pointer",
              selected
                ? "border-indigo-400/60 ring-2 ring-indigo-400/40"
                : "border-transparent hover:border-[var(--border-hover)]"
            )}
            style={{ ...layout.style, background: "var(--surface-card)" }}
            onClick={() => editable && onSelectSlot?.(slot.id)}
            role={editable ? "button" : undefined}
            tabIndex={editable ? 0 : undefined}
            onKeyDown={(e) => {
              if (editable && (e.key === "Enter" || e.key === " ")) onSelectSlot?.(slot.id);
            }}
          >
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-1">
              <SlotScopedContent slot={slot} data={data} compact={compact} />
            </div>
            {editable ? (
              <>
                <button
                  type="button"
                  className="absolute right-1 top-1 z-30 flex h-5 w-5 items-center justify-center rounded-full opacity-0 transition-opacity group-hover/slot:opacity-100"
                  style={{ background: "#ef4444", color: "white" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSlot(slot.id);
                  }}
                  aria-label={t("taskbarRemoveSlot")}
                >
                  <X size={10} />
                </button>
                {canResize ? (
                  <SlotResizeHandle
                    orientation={orientation}
                    onResize={(delta) => {
                      if (!onSlotsChange) return;
                      onSlotsChange(setSlotWeight(slots, slot.id, getSlotWeight(slot) + delta));
                    }}
                  />
                ) : null}
              </>
            ) : null}
          </div>
        );
      })}

      {editable && !hideAddButton && slots.length < MAX_TASKBAR_SLOTS ? (
        <div className={cn("relative shrink-0", isHorizontal ? "w-14 self-stretch" : "h-12 w-full")}>
          <button
            ref={addBtnRef}
            type="button"
            onClick={() => setAddMenuOpen((v) => !v)}
            className="flex h-full w-full items-center justify-center rounded-lg border border-dashed transition-colors hover:border-indigo-400"
            style={{ borderColor: "var(--border-color)", color: "var(--text-dim)" }}
          >
            <Plus size={16} />
          </button>
          <AddSlotMenu
            open={addMenuOpen}
            anchorRef={addBtnRef}
            onClose={() => setAddMenuOpen(false)}
            onPick={addSlot}
          />
        </div>
      ) : null}

      {!slots.length && !editable ? (
        <div className="flex flex-1 items-center justify-center py-6 text-xs text-[var(--text-dimmer)]">
          {t("taskbarEmpty")}
        </div>
      ) : null}
    </div>
  );
}

export {
  updateTaskbarSlotChartMetrics,
  updateTaskbarSlotMetric
} from "@/components/dashboard/canvas/widgets/CompositeSlotContent";
