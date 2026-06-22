"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { LayoutTemplate } from "lucide-react";

import { DashboardTemplateLivePreview, templatePreviewBodyHeight } from "@/components/dashboard/canvas/DashboardTemplateLivePreview";
import { cn } from "@/lib/cn";
import { resolveTemplateWidgets } from "@/lib/dashboard/dashboard-template-thumb";
import {
  computeTemplatePreviewPosition,
  maxTemplatePreviewBodyHeight,
  type FloatingPoint
} from "@/lib/dashboard/template-preview-position";
import type { useDashboardData } from "@/uxpilot-ui/adapters/useDashboardData";

type DashboardData = ReturnType<typeof useDashboardData>;

export type DashboardTemplateListItem = {
  id: string;
  name: string;
  category?: string;
  widgets?: unknown;
};

const POPOVER_WIDTH = 520;
const HEADER_HEIGHT = 52;

function TemplateHoverPreview({
  tpl,
  dashboardData,
  pointer
}: {
  tpl: DashboardTemplateListItem;
  dashboardData?: DashboardData;
  pointer: FloatingPoint;
}) {
  const t = useTranslations("dashboardWidgets");
  const widgets = resolveTemplateWidgets(tpl);
  const maxBody = maxTemplatePreviewBodyHeight(HEADER_HEIGHT, 20);
  const bodyHeight = templatePreviewBodyHeight(tpl, maxBody, POPOVER_WIDTH - 20);
  const totalHeight = HEADER_HEIGHT + bodyHeight + (dashboardData ? 8 : 0);

  const [pos, setPos] = useState(() =>
    computeTemplatePreviewPosition(pointer, { width: POPOVER_WIDTH, height: totalHeight })
  );

  useEffect(() => {
    setPos(
      computeTemplatePreviewPosition(pointer, { width: POPOVER_WIDTH, height: totalHeight })
    );
  }, [pointer.x, pointer.y, totalHeight]);

  useEffect(() => {
    const onReflow = () => {
      setPos(
        computeTemplatePreviewPosition(pointer, { width: POPOVER_WIDTH, height: totalHeight })
      );
    };
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [pointer, totalHeight]);

  return createPortal(
    <div
      className="pointer-events-none fixed z-[300] opacity-100 transition-[left,top] duration-75 ease-out"
      style={{ left: pos.left, top: pos.top, width: POPOVER_WIDTH }}
    >
      <div
        className="overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-sm"
        style={{
          borderColor: "rgba(99,102,241,0.4)",
          background: "color-mix(in srgb, var(--surface-card) 94%, transparent)",
          boxShadow: "0 28px 56px rgba(0,0,0,0.28), 0 0 0 1px rgba(99,102,241,0.12)"
        }}
      >
        <div
          className="flex items-center justify-between border-b px-3 py-2.5"
          style={{
            borderColor: "var(--border-color)",
            background: "linear-gradient(90deg, rgba(99,102,241,0.08), transparent)"
          }}
        >
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-dimmer)]">
              {t("templatesThumbPreview")}
            </p>
            <p className="truncate text-xs font-semibold text-[var(--text-main)]">{tpl.name}</p>
          </div>
          {dashboardData ? (
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
              style={{ background: "rgba(34,197,94,0.15)", color: "#16a34a" }}
            >
              LIVE
            </span>
          ) : (
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
              style={{ background: "rgba(99,102,241,0.12)", color: "#4f46e5" }}
            >
              {t("templatesWidgetCount", { count: widgets.length })}
            </span>
          )}
        </div>

        {dashboardData ? (
          <div
            className="relative px-2 pb-2 pt-1"
            style={{
              height: bodyHeight,
              background:
                "linear-gradient(180deg, var(--surface-bg) 0%, rgba(79,70,229,0.05) 100%)"
            }}
          >
            <DashboardTemplateLivePreview
              tpl={tpl}
              dashboardData={dashboardData}
              viewportHeight={bodyHeight}
              viewportWidth={POPOVER_WIDTH - 20}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 p-4">
            <div className="skeleton-shimmer h-[180px] w-full max-w-[260px] rounded-lg" />
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export function DashboardTemplatesModal({
  open,
  templates,
  applying,
  dashboardData,
  onClose,
  onApply
}: {
  open: boolean;
  templates: DashboardTemplateListItem[];
  applying: boolean;
  dashboardData?: DashboardData;
  onClose: () => void;
  onApply: (templateId: string) => void;
}) {
  const t = useTranslations("dashboardWidgets");
  const [hovered, setHovered] = useState<DashboardTemplateListItem | null>(null);
  const [pointer, setPointer] = useState<FloatingPoint | null>(null);

  if (!open) return null;

  const showHover = (tpl: DashboardTemplateListItem, e: { clientX: number; clientY: number }) => {
    setPointer({ x: e.clientX, y: e.clientY });
    setHovered(tpl);
  };

  const showHoverFromEl = (tpl: DashboardTemplateListItem, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    setPointer({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    setHovered(tpl);
  };

  const moveHover = (e: React.MouseEvent<HTMLElement>) => {
    setPointer({ x: e.clientX, y: e.clientY });
  };

  const hideHover = () => {
    setHovered(null);
    setPointer(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border shadow-xl"
        style={{ background: "var(--surface-card)", borderColor: "var(--border-color)" }}
      >
        <div className="ui-panel-header shrink-0 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <LayoutTemplate size={18} className="text-indigo-600" />
            <h2 className="font-heading text-base font-semibold text-[var(--text-main)]">
              {t("templatesTitle")}
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-[var(--text-dim)]">{t("templatesHint")}</p>
          <p className="mt-1 text-[10px] text-[var(--text-dimmer)]">{t("templatesThumbHint")}</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {templates.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-[var(--text-dim)]">{t("templatesEmpty")}</p>
          ) : (
            <ul className="space-y-2">
              {templates.map((tpl) => {
                const widgets = resolveTemplateWidgets(tpl);
                return (
                  <li key={tpl.id}>
                    <button
                      type="button"
                      disabled={applying}
                      onClick={() => onApply(tpl.id)}
                      onMouseEnter={(e) => showHover(tpl, e)}
                      onMouseMove={moveHover}
                      onMouseLeave={hideHover}
                      onFocus={(e) => showHoverFromEl(tpl, e.currentTarget)}
                      onBlur={hideHover}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                        "hover:border-indigo-300 disabled:opacity-50",
                        hovered?.id === tpl.id && "border-indigo-400 ring-1 ring-indigo-300/40"
                      )}
                      style={{ borderColor: "var(--border-color)", background: "var(--surface-bg)" }}
                    >
                      <div
                        className="h-12 w-20 shrink-0 overflow-hidden rounded-lg border"
                        style={{ borderColor: "var(--border-color)" }}
                      >
                        {dashboardData ? (
                          <DashboardTemplateLivePreview
                            tpl={tpl}
                            dashboardData={dashboardData}
                            viewportHeight={48}
                            viewportWidth={80}
                            compact
                          />
                        ) : (
                          <div className="skeleton-shimmer h-full w-full rounded-lg" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-[var(--text-main)]">{tpl.name}</div>
                        {tpl.category ? (
                          <div className="mt-0.5 text-xs capitalize text-[var(--text-dim)]">
                            {tpl.category.replace(/-/g, " ")}
                          </div>
                        ) : null}
                        <div className="mt-1 text-[10px] text-[var(--text-dimmer)]">
                          {t("templatesWidgetCount", { count: widgets.length })}
                        </div>
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-indigo-600">
                        {applying ? t("templateApplying") : t("templateApply")}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div
          className="flex justify-end border-t px-5 py-3"
          style={{ borderColor: "var(--border-color)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="ui-btn-ghost rounded-lg border px-4 py-2 text-sm"
            style={{ borderColor: "var(--border-color)" }}
          >
            {t("close")}
          </button>
        </div>
      </div>

      {hovered && pointer ? (
        <TemplateHoverPreview tpl={hovered} dashboardData={dashboardData} pointer={pointer} />
      ) : null}
    </div>
  );
}
