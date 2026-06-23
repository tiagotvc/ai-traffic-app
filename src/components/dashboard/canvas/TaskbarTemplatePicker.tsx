"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Crown, LayoutTemplate } from "lucide-react";

import {
  PremiumPreviewFrame,
  PremiumSvgDefs
} from "@/components/dashboard/canvas/PremiumPreviewFrame";
import { cn } from "@/lib/cn";
import {
  TASKBAR_TEMPLATES,
  type TaskbarTemplateSpec
} from "@/lib/dashboard/taskbar-templates";
import type { CompositeSlotKind } from "@/lib/dashboard/taskbar-config";

function blockStyle(kind: CompositeSlotKind): { fill: string; stroke: string } {
  switch (kind) {
    case "chart":
      return { fill: "rgba(124,58,237,0.32)", stroke: "rgba(245,166,35,0.32)" };
    case "alerts":
      return { fill: "rgba(245,166,35,0.2)", stroke: "rgba(251,191,36,0.38)" };
    default:
      return { fill: "rgba(16,185,129,0.26)", stroke: "rgba(52,211,153,0.38)" };
  }
}

function blockDetail(kind: CompositeSlotKind, x: number, y: number, w: number, h: number) {
  if (kind === "chart" && w > 8) {
    const d = [0.7, 0.5, 0.58, 0.35, 0.42, 0.22]
      .map((t, i) => {
        const px = x + 1.5 + (i / 5) * (w - 3);
        const py = y + h - 1.5 - t * (h - 3);
        return `${i === 0 ? "M" : "L"}${px},${py}`;
      })
      .join(" ");
    return (
      <path d={d} fill="none" stroke="url(#tpl-violet)" strokeWidth="0.8" strokeLinecap="round" />
    );
  }
  if (kind === "metric") {
    return (
      <>
        <rect x={x + 1.5} y={y + 1.5} width={Math.min(w - 3, 8)} height={1} rx={0.5} fill="rgba(196,181,253,0.45)" />
        <rect x={x + 1.5} y={y + h - 2.5} width={Math.min(w - 3, 6)} height={1.5} rx={0.6} fill="url(#tpl-emerald)" />
      </>
    );
  }
  if (kind === "alerts" && h > 4) {
    return [0, 1].map((i) => (
      <rect
        key={i}
        x={x + 1.5}
        y={y + 1.5 + i * 2}
        width={w - 3}
        height={1}
        rx={0.5}
        fill={i === 0 ? "rgba(251,191,36,0.55)" : "rgba(148,163,184,0.22)"}
      />
    ));
  }
  return null;
}

function layoutBlocks(
  tpl: TaskbarTemplateSpec,
  viewW: number,
  viewH: number,
  pad: number,
  gap: number
) {
  const totalWeight = tpl.thumbWeights.reduce((a, b) => a + b, 0) || 1;
  const isVertical = tpl.orientation === "vertical";
  const innerW = viewW - pad * 2;
  const innerH = viewH - pad * 2;
  let cursor = pad;

  return tpl.thumbKinds.map((kind, i) => {
    const weight = tpl.thumbWeights[i] ?? 1;
    const share = weight / totalWeight;

    if (isVertical) {
      const bh = innerH * share - (i < tpl.thumbKinds.length - 1 ? gap : 0);
      const block = { kind, x: pad, y: cursor, w: innerW, h: bh };
      cursor += bh + gap;
      return block;
    }

    const bw = innerW * share - (i < tpl.thumbKinds.length - 1 ? gap : 0);
    const block = { kind, x: cursor, y: pad, w: bw, h: innerH };
    cursor += bw + gap;
    return block;
  });
}

function TaskbarTemplateSvg({
  tpl,
  activeIndex = -1,
  viewW = 80,
  viewH = 48,
  className
}: {
  tpl: TaskbarTemplateSpec;
  activeIndex?: number;
  viewW?: number;
  viewH?: number;
  className?: string;
}) {
  const pad = 3;
  const gap = 1.1;
  const blocks = layoutBlocks(tpl, viewW, viewH, pad, gap);

  return (
    <PremiumPreviewFrame
      className={className}
      accent={tpl.premium ? "amber" : "violet"}
      borderRadius="10px"
      style={{ width: "100%", height: "100%" }}
    >
      <svg viewBox={`0 0 ${viewW} ${viewH}`} className="relative h-full w-full" aria-hidden>
        <PremiumSvgDefs />
        <rect x="0" y="0" width={viewW} height={viewH} fill="url(#tpl-glow)" />
        {blocks.map((block, i) => {
          const lit = activeIndex === i;
          const style = blockStyle(block.kind);
          return (
            <g key={`${block.kind}-${i}`}>
              <rect
                x={block.x}
                y={block.y}
                width={Math.max(block.w, 2)}
                height={Math.max(block.h, 2)}
                rx={1.6}
                fill={style.fill}
                stroke={lit ? "rgba(251,191,36,0.75)" : style.stroke}
                strokeWidth={lit ? 1 : 0.7}
                opacity={activeIndex < 0 || lit ? 1 : 0.72}
              />
              {blockDetail(block.kind, block.x, block.y, block.w, block.h)}
            </g>
          );
        })}
      </svg>
    </PremiumPreviewFrame>
  );
}

function TemplateThumb({
  tpl,
  activeIndex
}: {
  tpl: TaskbarTemplateSpec;
  activeIndex: number;
}) {
  return (
    <div className={cn("h-12 w-full", tpl.orientation === "vertical" && "h-14")}>
      <TaskbarTemplateSvg tpl={tpl} activeIndex={activeIndex} />
    </div>
  );
}

function TemplateHoverPreview({
  tpl,
  anchorRect
}: {
  tpl: TaskbarTemplateSpec;
  anchorRect: DOMRect;
}) {
  const t = useTranslations("dashboardWidgets");
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
  const previewHeight = tpl.orientation === "vertical" ? 240 : 168;

  return createPortal(
    <div
      className="pointer-events-none fixed z-[300] -translate-y-full opacity-100 transition-opacity duration-200"
      style={{ left, top, width }}
    >
      <div
        className="overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-sm"
        style={{
          borderColor: "rgba(245,166,35,0.32)",
          background:
            "linear-gradient(165deg, rgba(124,58,237,0.12) 0%, color-mix(in srgb, var(--surface-card) 92%, #0a0f14) 55%)",
          boxShadow:
            "0 24px 48px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 0 1px rgba(124,58,237,0.12)"
        }}
      >
        <div
          className="flex items-center justify-between border-b px-3 py-2"
          style={{
            borderColor: "rgba(245,166,35,0.14)",
            background: "linear-gradient(90deg, rgba(124,58,237,0.12), rgba(245,166,35,0.04))"
          }}
        >
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-200/55">
              {t("taskbarTplPreview")}
            </p>
            <p className="text-xs font-semibold text-[var(--text-main)]">{t(tpl.titleKey)}</p>
          </div>
        </div>

        <div className="p-2.5" style={{ height: previewHeight }}>
          <TaskbarTemplateSvg tpl={tpl} activeIndex={activeIndex} viewW={80} viewH={48} />
        </div>

        <div className="border-t px-3 py-2" style={{ borderColor: "rgba(245,166,35,0.12)" }}>
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
  onApply
}: {
  activeTemplateId?: string | null;
  advancedUnlocked: boolean;
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
      style={{
        borderColor: "rgba(124,58,237,0.16)",
        background: "linear-gradient(165deg, rgba(124,58,237,0.06) 0%, var(--surface-bg) 50%)"
      }}
    >
      <div className="mb-2.5 flex items-center gap-2">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: "rgba(124,58,237,0.16)", boxShadow: "inset 0 0 0 1px rgba(245,166,35,0.18)" }}
        >
          <LayoutTemplate size={13} style={{ color: "#c4b5fd" }} />
        </div>
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
                "w-[132px] shrink-0 rounded-xl border p-2.5 text-left transition-all duration-200",
                locked ? "cursor-not-allowed opacity-55" : "hover:-translate-y-0.5 hover:shadow-md",
                active && "ring-2 ring-amber-400/30"
              )}
              style={{
                borderColor: active ? "rgba(245,166,35,0.38)" : "rgba(124,58,237,0.16)",
                background: active
                  ? "linear-gradient(165deg, rgba(245,166,35,0.1) 0%, var(--surface-card) 50%)"
                  : "linear-gradient(165deg, rgba(124,58,237,0.06) 0%, var(--surface-card) 50%)"
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
                <span className="mt-1.5 inline-flex items-center gap-0.5 text-[8px] font-bold uppercase text-amber-400">
                  <Crown size={9} />
                  {t("category_premium")}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {hovered && hoverRect ? <TemplateHoverPreview tpl={hovered} anchorRect={hoverRect} /> : null}
    </div>
  );
}
