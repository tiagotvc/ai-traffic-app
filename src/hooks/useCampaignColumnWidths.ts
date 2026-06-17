"use client";

import { useCallback, useEffect, useState, type PointerEvent as ReactPointerEvent } from "react";

const WIDTHS_KEY = "traffic-campaign-column-widths-v2";

export type ColumnWidths = Record<string, number>;

export function loadColumnWidths(): ColumnWidths {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(WIDTHS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ColumnWidths;
    if (!parsed || typeof parsed !== "object") return {};
    const out: ColumnWidths = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "number" && v >= 48) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function saveColumnWidths(widths: ColumnWidths) {
  if (typeof window === "undefined") return;
  localStorage.setItem(WIDTHS_KEY, JSON.stringify(widths));
}

export function useCampaignColumnWidths() {
  const [widths, setWidths] = useState<ColumnWidths>({});

  useEffect(() => {
    setWidths(loadColumnWidths());
  }, []);

  const persist = useCallback((next: ColumnWidths) => {
    setWidths(next);
    saveColumnWidths(next);
  }, []);

  const onResizeStart = useCallback(
    (colKey: string, e: ReactPointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startW = widths[colKey] ?? (e.currentTarget as HTMLElement).offsetWidth ?? 120;

      function onMove(ev: PointerEvent) {
        const w = Math.max(48, Math.min(480, startW + (ev.clientX - startX)));
        setWidths((prev) => ({ ...prev, [colKey]: w }));
      }

      function onUp() {
        setWidths((prev) => {
          saveColumnWidths(prev);
          return prev;
        });
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      }

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [widths]
  );

  return { widths, onResizeStart, persist };
}
