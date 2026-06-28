"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import type { AlertCardPayload, AlertDisplaySize, AlertVisualConfig } from "@/lib/dashboard/alert-widget-config";
import {
  AlertBadge,
  AlertCardShell,
  AlertDelta,
  chartHeightForSize,
  useAlertTheme
} from "./AlertCardShell";
import { AlertMiniChart } from "./AlertMiniChart";

type TemplateProps = {
  data: AlertCardPayload;
  visual: AlertVisualConfig;
  layout: "horizontal" | "vertical";
  displaySize: AlertDisplaySize;
};

function DetailLink({ href, label, accent }: { href?: string; label?: string; accent: string }) {
  if (!href || !label) return null;
  return (
    <Link
      href={href}
      className="shrink-0 text-[11px] font-medium transition-opacity hover:opacity-80"
      style={{ color: accent }}
    >
      {label} →
    </Link>
  );
}

function MetricBody({
  data,
  tokens,
  displaySize
}: {
  data: AlertCardPayload;
  tokens: ReturnType<typeof useAlertTheme>;
  displaySize: AlertDisplaySize;
}) {
  const minimal = displaySize === "minimal";
  return (
    <div className="flex flex-1 flex-col gap-1.5 sm:gap-2">
      <h3
        className={cn(
          "font-bold leading-snug",
          minimal ? "line-clamp-2 text-xs" : "text-sm"
        )}
        style={{ color: tokens.text }}
      >
        {data.headline}
      </h3>
      {!minimal && data.description ? (
        <p className="line-clamp-2 text-xs leading-relaxed" style={{ color: tokens.textDim }}>
          {data.description}
        </p>
      ) : null}
      <div className="mt-0.5 flex flex-wrap items-end gap-2 sm:gap-3">
        {data.metricValue ? (
          <div>
            {data.metricLabel ? (
              <p className="text-[10px] font-semibold uppercase" style={{ color: tokens.textDim }}>
                {data.metricLabel}
              </p>
            ) : null}
            <p
              className={cn("font-bold tabular-nums", minimal ? "text-lg" : "text-xl sm:text-2xl")}
              style={{ color: tokens.text }}
            >
              {data.metricValue}
            </p>
          </div>
        ) : null}
        <AlertDelta label={data.deltaLabel} trend={data.deltaTrend} accent={tokens.accent} />
        {data.badgeLabel ? (
          <AlertBadge label={data.badgeLabel} tone={data.badgeTone} accent={tokens.accent} dark={tokens.isDark} />
        ) : null}
      </div>
      {!minimal && data.thresholdLabel ? (
        <p className="text-[11px]" style={{ color: tokens.textDim }}>
          {data.thresholdLabel}
        </p>
      ) : null}
    </div>
  );
}

function ChartBlock({
  data,
  tokens,
  layout,
  displaySize,
  threshold
}: {
  data: AlertCardPayload;
  tokens: ReturnType<typeof useAlertTheme>;
  layout: "horizontal" | "vertical";
  displaySize: AlertDisplaySize;
  threshold?: number;
}) {
  if (displaySize === "minimal") return undefined;
  const h = chartHeightForSize(displaySize, layout);
  return (
    <AlertMiniChart
      series={data.series}
      comparisonSeries={data.comparisonSeries}
      accent={tokens.accent}
      threshold={threshold}
      dark={tokens.isDark}
      height={h}
      compact={displaySize === "compact"}
    />
  );
}

export function AlertMetricThresholdTemplate({ data, visual, layout, displaySize }: TemplateProps) {
  const tokens = useAlertTheme(visual);
  return (
    <AlertCardShell
      visual={visual}
      icon="alert"
      categoryLabel={data.categoryLabel}
      layout={layout}
      displaySize={displaySize}
      action={displaySize !== "minimal" ? <DetailLink href={data.actionHref} label={data.actionLabel} accent={tokens.accent} /> : undefined}
      chart={ChartBlock({ data, tokens, layout, displaySize, threshold: data.thresholdValue })}
      body={<MetricBody data={data} tokens={tokens} displaySize={displaySize} />}
    />
  );
}

export function AlertBrainInsightTemplate({ data, visual, layout, displaySize }: TemplateProps) {
  const tokens = useAlertTheme(visual);
  const minimal = displaySize === "minimal";
  return (
    <AlertCardShell
      visual={visual}
      icon="brain"
      categoryLabel={data.categoryLabel}
      layout={layout}
      displaySize={displaySize}
      action={!minimal ? <DetailLink href={data.actionHref} label={data.actionLabel} accent={tokens.accent} /> : undefined}
      chart={ChartBlock({ data, tokens, layout, displaySize })}
      body={
        <div className="flex flex-1 flex-col gap-1.5 sm:gap-2">
          <h3 className={cn("font-bold leading-snug", minimal ? "line-clamp-2 text-xs" : "text-sm")} style={{ color: tokens.text }}>
            {data.headline}
          </h3>
          {!minimal && data.description ? (
            <p className="line-clamp-2 text-xs leading-relaxed" style={{ color: tokens.textDim }}>
              {data.description}
            </p>
          ) : null}
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            {data.badgeLabel ? (
              <AlertBadge label={data.badgeLabel} tone={data.badgeTone} accent={tokens.accent} dark={tokens.isDark} />
            ) : null}
            {!minimal && data.confidenceLabel ? (
              <span className="text-[11px]" style={{ color: tokens.textDim }}>
                {data.confidenceLabel}
              </span>
            ) : null}
            <AlertDelta label={data.deltaLabel} trend={data.deltaTrend} accent={tokens.accent} />
          </div>
        </div>
      }
    />
  );
}

export function AlertBrainProgressTemplate({ data, visual, layout, displaySize }: TemplateProps) {
  const tf = useTranslations("appFeedback");
  const tokens = useAlertTheme(visual);
  const pct = data.progressPercent ?? 0;
  const minimal = displaySize === "minimal";
  return (
    <AlertCardShell
      visual={visual}
      icon="brain"
      categoryLabel={data.categoryLabel}
      layout={layout}
      displaySize={displaySize}
      action={!minimal ? <DetailLink href={data.actionHref} label={data.actionLabel} accent={tokens.accent} /> : undefined}
      chart={displaySize === "full" ? ChartBlock({ data, tokens, layout, displaySize }) : undefined}
      body={
        <div className="flex flex-1 flex-col gap-1.5 sm:gap-2">
          <h3 className={cn("font-bold", minimal ? "text-xs" : "text-sm")} style={{ color: tokens.text }}>
            {data.headline}
          </h3>
          {!minimal && data.description ? (
            <p className="line-clamp-2 text-xs" style={{ color: tokens.textDim }}>
              {data.description}
            </p>
          ) : null}
          {data.badgeLabel ? (
            <AlertBadge label={data.badgeLabel} tone={data.badgeTone} accent={tokens.accent} dark={tokens.isDark} />
          ) : null}
          {!minimal ? (
            <div className="mt-1">
              <div className="mb-1 flex justify-between text-[10px]" style={{ color: tokens.textDim }}>
                <span>{tf("learningPhase")}</span>
                <span>{pct}%</span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full"
                style={{ background: tokens.isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: tokens.accent }}
                />
              </div>
              {data.progressHint ? (
                <p className="mt-1 text-[10px]" style={{ color: tokens.textDim }}>
                  {data.progressHint}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      }
    />
  );
}

export function AlertCompactTemplate({ data, visual, layout, displaySize }: TemplateProps) {
  const tokens = useAlertTheme(visual);
  return (
    <AlertCardShell
      visual={visual}
      icon="trend"
      categoryLabel={data.categoryLabel}
      layout={layout}
      displaySize={displaySize}
      body={
        <div className="flex flex-1 flex-col justify-between gap-2">
          <h3 className="line-clamp-2 text-xs font-semibold leading-snug sm:text-sm" style={{ color: tokens.text }}>
            {data.headline}
          </h3>
          <div className="flex items-center justify-between gap-2">
            {data.metricValue ? (
              <span className="text-lg font-bold tabular-nums sm:text-xl" style={{ color: tokens.text }}>
                {data.metricValue}
              </span>
            ) : null}
            <AlertDelta label={data.deltaLabel} trend={data.deltaTrend} accent={tokens.accent} />
          </div>
          {data.badgeLabel ? (
            <AlertBadge label={data.badgeLabel} tone={data.badgeTone} accent={tokens.accent} dark={tokens.isDark} />
          ) : null}
        </div>
      }
    />
  );
}
