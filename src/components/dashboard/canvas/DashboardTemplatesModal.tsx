"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { LayoutTemplate } from "lucide-react";

import {
  DashboardTemplateThumb,
  dashboardTemplateThumbHeight
} from "@/components/dashboard/canvas/DashboardTemplateThumb";
import { cn } from "@/lib/cn";
import { resolveTemplateWidgets } from "@/lib/dashboard/dashboard-template-thumb";
import {
  computeTemplatePreviewPosition,
  maxTemplatePreviewBodyHeight,
  type FloatingPoint
} from "@/lib/dashboard/template-preview-position";

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
  pointer
}: {
  tpl: DashboardTemplateListItem;
  pointer: FloatingPoint;
}) {
  const t = useTranslations("dashboardWidgets");
  const widgets = resolveTemplateWidgets(tpl);
  const maxBody = maxTemplatePreviewBodyHeight(HEADER_HEIGHT, 20);
  const bodyHeight = dashboardTemplateThumbHeight(widgets, maxBody);
  const totalHeight = HEADER_HEIGHT + bodyHeight + 12;

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
          borderColor: "rgba(245,166,35,0.32)",
          background:
            "linear-gradient(165deg, rgba(124,58,237,0.12) 0%, color-mix(in srgb, var(--surface-card) 92%, #0a0f14) 55%)",
          boxShadow:
            "0 28px 56px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 0 1px rgba(124,58,237,0.12)"
        }}
      >
        <div
          className="flex items-center justify-between border-b px-3 py-2.5"
          style={{
            borderColor: "rgba(245,166,35,0.14)",
            background: "linear-gradient(90deg, rgba(124,58,237,0.12), rgba(245,166,35,0.04))"
          }}
        >
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-200/55">
              {t("templatesThumbPreview")}
            </p>
            <p className="truncate text-xs font-semibold text-[var(--text-main)]">{tpl.name}</p>
          </div>
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
            style={{
              background: "linear-gradient(135deg, rgba(245,166,35,0.22), rgba(124,58,237,0.16))",
              color: "#fde68a",
              boxShadow: "inset 0 0 0 1px rgba(245,166,35,0.24)"
            }}
          >
            {t("templatesWidgetCount", { count: widgets.length })}
          </span>
        </div>

        <div className="px-2.5 pb-2.5 pt-2" style={{ height: bodyHeight }}>
          <DashboardTemplateThumb widgets={widgets} width="100%" height="100%" />
        </div>
      </div>
    </div>,
    document.body
  );
}

export function DashboardTemplatesModal({
  open,
  templates,
  applying,
  onClose,
  onApply
}: {
  open: boolean;
  templates: DashboardTemplateListItem[];
  applying: boolean;
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
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: "rgba(124,58,237,0.16)", boxShadow: "inset 0 0 0 1px rgba(245,166,35,0.18)" }}
            >
              <LayoutTemplate size={16} style={{ color: "#c4b5fd" }} />
            </div>
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
                const isHovered = hovered?.id === tpl.id;
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
                        "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-200",
                        "hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50",
                        isHovered && "ring-1 ring-amber-400/25"
                      )}
                      style={{
                        borderColor: isHovered ? "rgba(245,166,35,0.34)" : "rgba(124,58,237,0.16)",
                        background: isHovered
                          ? "linear-gradient(165deg, rgba(124,58,237,0.1) 0%, var(--surface-bg) 52%)"
                          : "linear-gradient(165deg, rgba(124,58,237,0.06) 0%, var(--surface-bg) 50%)"
                      }}
                    >
                      <div className="h-14 w-24 shrink-0">
                        <DashboardTemplateThumb widgets={widgets} width="100%" height="100%" />
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
                      <span
                        className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold"
                        style={{
                          background: "linear-gradient(135deg, rgba(124,58,237,0.18), rgba(79,70,229,0.1))",
                          color: "#c4b5fd",
                          boxShadow: "inset 0 0 0 1px rgba(124,58,237,0.18)"
                        }}
                      >
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
            className="ui-btn-ghost border px-4 py-2 text-sm"
            style={{ borderColor: "var(--border-color)" }}
          >
            {t("close")}
          </button>
        </div>
      </div>

      {hovered && pointer ? <TemplateHoverPreview tpl={hovered} pointer={pointer} /> : null}
    </div>
  );
}
