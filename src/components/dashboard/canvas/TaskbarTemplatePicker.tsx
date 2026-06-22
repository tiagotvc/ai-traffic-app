"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Crown, LayoutTemplate } from "lucide-react";

import { TaskbarWidget } from "@/components/dashboard/canvas/widgets/TaskbarWidget";
import { WidgetLivePreview } from "@/components/dashboard/canvas/WidgetLivePreview";
import { cn } from "@/lib/cn";
import {
  TASKBAR_TEMPLATES,
  templatePreviewConfig,
  thumbBlockColor,
  type TaskbarTemplateSpec
} from "@/lib/dashboard/taskbar-templates";
import { normalizeTaskbarSlots } from "@/lib/dashboard/taskbar-config";
import type { useDashboardData } from "@/uxpilot-ui/adapters/useDashboardData";

type DashboardData = ReturnType<typeof useDashboardData>;

function TemplateThumb({
  tpl,
  activeIndex
}: {
  tpl: TaskbarTemplateSpec;
  activeIndex: number;
}) {
  const isVertical = tpl.orientation === "vertical";
  const weights = tpl.thumbWeights;

  return (
    <div
      className={cn(
        "flex gap-0.5 rounded-md border p-1",
        isVertical ? "h-12 flex-col" : "h-12 w-full flex-row"
      )}
      style={{ borderColor: "var(--border-color)", background: "var(--surface-bg)" }}
    >
      {tpl.thumbKinds.map((kind, i) => {
        const flex = weights[i] ?? 1;
        const lit = i === activeIndex;
        return (
          <div
            key={`${kind}-${i}`}
            className={cn("min-h-0 min-w-0 rounded-sm transition-all duration-300", lit && "ring-1 ring-indigo-400")}
            style={{
              flex: isVertical ? undefined : `${flex} 1 0`,
              height: isVertical ? `${flex * 18}%` : undefined,
              width: isVertical ? "100%" : undefined,
              background: thumbBlockColor(kind),
              opacity: lit ? 1 : 0.55,
              transform: lit ? "scale(1.02)" : "scale(1)"
            }}
          />
        );
      })}
    </div>
  );
}

function TemplateHoverPreview({
  tpl,
  dashboardData,
  anchorRect
}: {
  tpl: TaskbarTemplateSpec;
  dashboardData?: DashboardData;
  anchorRect: DOMRect;
}) {
  const t = useTranslations("dashboardWidgets");
  const previewConfig = templatePreviewConfig(tpl);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setActiveIndex((i) => (i + 1) % tpl.thumbKinds.length);
    }, 900);
    return () => window.clearInterval(id);
  }, [tpl.thumbKinds.length]);

  const width = 340;
  const left = Math.min(
    Math.max(12, anchorRect.left + anchorRect.width / 2 - width / 2),
    window.innerWidth - width - 12
  );
  const top = anchorRect.top - 12;

  return createPortal(
    <div
      className="pointer-events-none fixed z-[300] -translate-y-full opacity-100 transition-opacity duration-200"
      style={{ left, top, width }}
    >
      <div
        className="overflow-hidden rounded-2xl border shadow-2xl"
        style={{
          borderColor: "rgba(99,102,241,0.35)",
          background: "var(--surface-card)",
          boxShadow: "0 24px 48px rgba(0,0,0,0.35)"
        }}
      >
        <div
          className="flex items-center justify-between border-b px-3 py-2"
          style={{ borderColor: "var(--border-color)" }}
        >
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-dimmer)]">
              {t("taskbarTplPreview")}
            </p>
            <p className="text-xs font-semibold text-[var(--text-main)]">{t(tpl.titleKey)}</p>
          </div>
          <span
            className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
            style={{ background: "rgba(34,197,94,0.15)", color: "#16a34a" }}
          >
            LIVE
          </span>
        </div>

        <div
          className="relative overflow-hidden"
          style={{
            height: tpl.orientation === "vertical" ? 220 : 160,
            background: "linear-gradient(180deg, var(--surface-bg), rgba(79,70,229,0.04))"
          }}
        >
          <div
            className="absolute left-1/2 top-1/2 origin-center"
            style={{
              width: tpl.orientation === "vertical" ? 200 : 620,
              height: tpl.orientation === "vertical" ? 360 : 220,
              transform: `translate(-50%, -50%) scale(${tpl.orientation === "vertical" ? 0.48 : 0.5})`
            }}
          >
            {dashboardData ? (
              <TaskbarWidget
                data={dashboardData}
                orientation={tpl.orientation}
                slots={normalizeTaskbarSlots(previewConfig.slots)}
                hideAddButton
              />
            ) : (
              <WidgetLivePreview widgetType="layout.taskbar" config={previewConfig} />
            )}
          </div>

          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.08) 50%, transparent 100%)",
              animation: "taskbar-tpl-shimmer 2.4s ease-in-out infinite"
            }}
          />
        </div>

        <div className="border-t px-3 py-2" style={{ borderColor: "var(--border-color)" }}>
          <TemplateThumb tpl={tpl} activeIndex={activeIndex} />
        </div>
      </div>
    </div>,
    document.body
  );
}

export function TaskbarTemplatePicker({
  activeTemplateId,
  advancedUnlocked,
  dashboardData,
  onApply
}: {
  activeTemplateId?: string | null;
  advancedUnlocked: boolean;
  dashboardData?: DashboardData;
  onApply: (templateId: string) => void;
}) {
  const t = useTranslations("dashboardWidgets");
  const [hovered, setHovered] = useState<TaskbarTemplateSpec | null>(null);
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onEnter = (tpl: TaskbarTemplateSpec, el: HTMLElement) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      setHovered(tpl);
      setHoverRect(el.getBoundingClientRect());
    }, 280);
  };

  const onLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setHovered(null);
    setHoverRect(null);
  };

  return (
    <div
      className="rounded-2xl border p-3"
      style={{ borderColor: "var(--border-color)", background: "var(--surface-bg)" }}
    >
      <div className="mb-2.5 flex items-center gap-2">
        <LayoutTemplate size={14} className="text-indigo-400" />
        <div>
          <p className="text-xs font-semibold text-[var(--text-main)]">{t("taskbarTplTitle")}</p>
          <p className="text-[10px] text-[var(--text-dim)]">{t("taskbarTplHint")}</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TASKBAR_TEMPLATES.map((tpl) => {
          const locked = tpl.premium && !advancedUnlocked;
          const active = activeTemplateId === tpl.id;
          return (
            <button
              key={tpl.id}
              type="button"
              disabled={locked}
              onMouseEnter={(e) => !locked && onEnter(tpl, e.currentTarget)}
              onMouseLeave={onLeave}
              onFocus={(e) => !locked && onEnter(tpl, e.currentTarget)}
              onBlur={onLeave}
              onClick={() => !locked && onApply(tpl.id)}
              className={cn(
                "w-[132px] shrink-0 rounded-xl border p-2.5 text-left transition-all",
                locked ? "cursor-not-allowed opacity-55" : "hover:border-indigo-400/50 hover:shadow-md",
                active && "ring-2 ring-indigo-400/40"
              )}
              style={{
                borderColor: active ? "rgba(99,102,241,0.45)" : "var(--border-color)",
                background: active ? "rgba(79,70,229,0.06)" : "var(--surface-card)"
              }}
            >
              <TemplateThumb tpl={tpl} activeIndex={-1} />
              <p className="mt-2 line-clamp-1 text-[11px] font-semibold text-[var(--text-main)]">
                {t(tpl.titleKey)}
              </p>
              <p className="mt-0.5 line-clamp-2 text-[9px] leading-snug text-[var(--text-dimmer)]">
                {t(tpl.descriptionKey)}
              </p>
              {tpl.premium ? (
                <span className="mt-1.5 inline-flex items-center gap-0.5 text-[8px] font-bold uppercase text-amber-500">
                  <Crown size={9} />
                  {t("category_premium")}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {hovered && hoverRect ? (
        <TemplateHoverPreview tpl={hovered} dashboardData={dashboardData} anchorRect={hoverRect} />
      ) : null}
    </div>
  );
}
