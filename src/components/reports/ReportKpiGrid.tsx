"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { ReactNode } from "react";

import type { MetricKey } from "@/lib/dashboard-metrics";

function SortableKpiSlot({
  id,
  editMode,
  children
}: {
  id: MetricKey;
  editMode: boolean;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !editMode
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
    zIndex: isDragging ? 2 : undefined
  };

  return (
    <div ref={setNodeRef} style={style} className="relative min-w-0">
      {editMode ? (
        <button
          type="button"
          className="absolute left-2 top-2 z-[2] flex h-7 w-7 cursor-grab items-center justify-center rounded-md border border-[var(--creator-card-border,var(--border-color))] bg-[var(--creator-card-bg,var(--surface-card))] text-[var(--text-dim)] shadow-sm active:cursor-grabbing"
          aria-label="Reordenar métrica"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={14} />
        </button>
      ) : null}
      <div className={editMode ? "rounded-xl ring-2 ring-[var(--ui-accent-border)] ring-offset-2 ring-offset-[var(--creator-card-bg,var(--surface-bg))]" : ""}>
        {children}
      </div>
    </div>
  );
}

export function ReportKpiGrid({
  metrics,
  editMode,
  onReorder,
  renderCard
}: {
  metrics: MetricKey[];
  editMode: boolean;
  onReorder: (order: MetricKey[]) => void;
  renderCard: (key: MetricKey) => ReactNode;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = metrics.indexOf(active.id as MetricKey);
    const to = metrics.indexOf(over.id as MetricKey);
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(metrics, from, to));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={metrics} strategy={rectSortingStrategy}>
        <div className="report-pdf-grid-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {metrics.map((key) => (
            <SortableKpiSlot key={key} id={key} editMode={editMode}>
              {renderCard(key)}
            </SortableKpiSlot>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
