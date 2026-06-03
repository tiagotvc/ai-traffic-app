"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { CampaignColumnId } from "@/lib/campaign-table-columns";

export function CampaignHeaderCell({
  col,
  label,
  sortActive,
  sortDir,
  onSort,
  onResizeStart
}: {
  col: CampaignColumnId;
  label: string;
  sortActive: boolean;
  sortDir: "asc" | "desc";
  onSort: (col: CampaignColumnId) => void;
  onResizeStart: (col: CampaignColumnId, e: ReactPointerEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: col
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative",
    cursor: "default"
  };

  return (
    <th ref={setNodeRef} style={style} className="select-none px-3 py-3 first:pl-4">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className="cursor-grab text-slate-300 hover:text-slate-500 active:cursor-grabbing"
          aria-label="Reordenar coluna"
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>
        <button
          type="button"
          onClick={() => onSort(col)}
          className="flex items-center gap-1 uppercase tracking-wide hover:text-slate-800"
        >
          <span>{label}</span>
          <span className="text-[10px] text-violet-600">
            {sortActive ? (sortDir === "asc" ? "▲" : "▼") : ""}
          </span>
        </button>
      </div>
      <span
        onPointerDown={(e) => onResizeStart(col, e)}
        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize touch-none hover:bg-violet-300"
        aria-hidden
      />
    </th>
  );
}
