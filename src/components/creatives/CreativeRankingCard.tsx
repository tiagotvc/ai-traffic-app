"use client";

import {
  BarChart2,
  Eye,
  Image,
  LayoutGrid,
  Star,
  TrendingUp,
  Video
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { creativePreviewUrlCandidates, shouldUseCoverPreview } from "@/lib/creative-preview-url";
import { formatMetricValue, METRIC_BY_KEY, type MetricKey } from "@/lib/dashboard-metrics";
import { cn } from "@/lib/cn";

function getScoreColor(score: number) {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#f5a623";
  return "#ef4444";
}

function getScoreLabel(score: number) {
  if (score >= 80) return "Excelente";
  if (score >= 60) return "Bom";
  return "Fraco";
}

function mapCreativeType(type?: string): "Video" | "Imagem" | "Carrossel" {
  const t = (type ?? "").toLowerCase();
  if (t.includes("video")) return "Video";
  if (t.includes("carousel") || t.includes("carrossel")) return "Carrossel";
  return "Imagem";
}

function mapStatusLabel(status: string): "Ativo" | "Pausado" | "Encerrado" {
  const s = status.toUpperCase();
  if (s === "ACTIVE") return "Ativo";
  if (s === "PAUSED") return "Pausado";
  return "Encerrado";
}

export type CreativeRankingCardProps = {
  rank: number;
  title: string;
  creativeName?: string | null;
  type?: string;
  campaignType?: string;
  campaignsUsed: number;
  status: string;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  score?: number;
  metrics: Partial<Record<MetricKey, number>>;
  primaryMetric?: MetricKey;
  metricKeys?: MetricKey[];
  onPreview: () => void;
  onCompare?: () => void;
  variant?: "default" | "report";
};

export function CreativeRankingCard({
  rank,
  title,
  creativeName,
  type,
  campaignType,
  campaignsUsed,
  status,
  imageUrl,
  thumbnailUrl,
  score: scoreProp,
  metrics,
  primaryMetric = "roas",
  metricKeys = ["roas", "ctr", "cpa", "cpm", "impressions", "spend"],
  onPreview,
  onCompare,
  variant = "default"
}: CreativeRankingCardProps) {
  const locale = useLocale();
  const tMetrics = useTranslations("metrics");
  const isFirst = rank === 1;
  const isTop3 = rank <= 3;
  const score = scoreProp ?? Math.max(35, 100 - (rank - 1) * 8);
  const scoreColor = getScoreColor(score);
  const scoreLabel = getScoreLabel(score);
  const creativeType = mapCreativeType(type);
  const statusLabel = mapStatusLabel(status);
  const isReport = variant === "report";
  const imgCandidates = useMemo(
    () => creativePreviewUrlCandidates(imageUrl, thumbnailUrl),
    [imageUrl, thumbnailUrl]
  );
  const [imgCandidateIdx, setImgCandidateIdx] = useState(0);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgCandidateIdx(0);
    setImgFailed(false);
  }, [imgCandidates]);

  const imgSrc = imgFailed ? null : (imgCandidates[imgCandidateIdx] ?? null);
  const coverPreview = !isReport && shouldUseCoverPreview(imageUrl, thumbnailUrl);

  function handleImgError() {
    if (imgCandidateIdx + 1 < imgCandidates.length) {
      setImgCandidateIdx((idx) => idx + 1);
      return;
    }
    setImgFailed(true);
  }

  const rankColors = ["#f5a623", "#94a3b8", "#cd7c2f"];
  const displayMetrics = isReport ? metricKeys.slice(0, 3) : metricKeys.slice(0, 6);
  const displayLabel = isReport ? creativeName?.trim() || title : title;
  const mediaHeight = isReport ? "report-creative-media" : "h-28";

  return (
    <div
      className={cn(
        "min-w-0 transition-all",
        isReport
          ? "report-creative-card flex h-full flex-col overflow-hidden rounded-lg"
          : cn(
              "campaign-creator-card campaign-creator-card--compact overflow-hidden !space-y-0 !p-0 hover:-translate-y-px",
              isFirst && "ring-1 ring-[var(--ui-accent-border)]"
            )
      )}
      style={
        isReport
          ? undefined
          : {
              borderColor: isFirst ? "var(--ui-accent-border)" : undefined,
              boxShadow: isFirst ? "0 2px 12px var(--ui-accent-glow)" : undefined
            }
      }
    >
      <div
        className={`relative overflow-hidden ${mediaHeight} ${
          coverPreview || isReport ? "bg-[var(--surface-bg)]" : "bg-[#0f1419]"
        } ${isReport ? "min-h-[220px] flex-1 border-b border-[var(--border-color)]" : ""} ${
          !coverPreview && !isReport ? "flex items-center justify-center" : ""
        } ${isReport ? "flex items-center justify-center" : ""}`}
      >
        {imgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt={displayLabel}
            decoding="async"
            onError={handleImgError}
            className={
              coverPreview
                ? "absolute inset-0 z-0 block h-full w-full object-cover object-center"
                : isReport
                  ? "absolute inset-0 z-0 block h-full w-full object-contain object-center p-1"
                  : "relative z-0 block max-h-full max-w-full object-contain object-center"
            }
          />
        ) : (
          <span
            className={`flex h-full w-full items-center justify-center opacity-40 ${isReport ? "text-2xl" : "text-3xl"}`}
          >
            🖼️
          </span>
        )}
        {!isReport ? (
          <div
            className="pointer-events-none absolute inset-0 z-[1]"
            style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.35) 100%)" }}
          />
        ) : null}
        <div
          className={`absolute z-[2] flex items-center justify-center rounded-full font-bold shadow-sm ${
            isReport ? "left-1.5 top-1.5 h-5 w-5 text-[9px]" : "left-2 top-2 h-6 w-6 text-[10px]"
          }`}
          style={{
            background: isTop3 ? rankColors[rank - 1] : "rgba(15,20,25,0.7)",
            color: "#fff",
            border: "1.5px solid rgba(255,255,255,0.35)"
          }}
        >
          {isFirst ? <Star size={isReport ? 9 : 11} fill="#fff" color="#fff" /> : `#${rank}`}
        </div>
        {!isReport ? (
          <>
            <div
              className="absolute right-2 top-2 z-[2] flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
              style={{ background: "rgba(0,0,0,0.6)", color: "#fff", backdropFilter: "blur(4px)" }}
            >
              {creativeType === "Video" && <Video size={10} />}
              {creativeType === "Imagem" && <Image size={10} />}
              {creativeType === "Carrossel" && <LayoutGrid size={10} />}
              {creativeType}
            </div>
            <div
              className="absolute bottom-2 right-2 z-[2] flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{
                background: statusLabel === "Ativo" ? "rgba(16,185,129,0.85)" : "rgba(239,68,68,0.85)",
                color: "#fff"
              }}
            >
              <span className="inline-block h-1 w-1 rounded-full bg-white" />
              {statusLabel}
            </div>
            {campaignType ? (
              <div
                className="absolute bottom-2 left-2 z-[2] max-w-[calc(100%-4rem)] truncate rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{ background: "var(--ui-accent)", color: "var(--ui-accent-btn-text)" }}
              >
                {campaignType}
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <div className={`border-b border-[var(--creator-card-border,var(--border-color))] ${isReport ? "px-2.5 py-2" : "px-2.5 py-2"}`}>
        <div className={isReport ? "flex items-start justify-between gap-2" : undefined}>
          <p
            className={`min-w-0 font-semibold leading-snug text-[var(--text-main)] ${
              isReport ? "line-clamp-2 break-words text-[11px]" : "line-clamp-1 text-xs"
            }`}
            title={displayLabel}
          >
            {displayLabel}
          </p>
          {isReport ? (
            <span
              className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-none"
              style={{ background: `${scoreColor}18`, color: scoreColor }}
            >
              {score}
            </span>
          ) : null}
        </div>
        {!isReport ? (
          <p className="mt-0.5 text-[10px] text-[var(--text-dimmer)]">Usado em {campaignsUsed} campanha(s)</p>
        ) : null}
      </div>

      {!isReport ? (
        <div className="border-b border-[var(--creator-card-border,var(--border-color))] px-2.5 py-2">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">Score</span>
            <div className="flex items-center gap-1.5">
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                style={{ background: `${scoreColor}18`, color: scoreColor }}
              >
                {scoreLabel}
              </span>
              <span className="text-sm font-bold" style={{ color: scoreColor }}>
                {score}
              </span>
            </div>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--creator-card-bg-inset,var(--surface-bg))]">
            <div className="h-full rounded-full" style={{ width: `${score}%`, background: scoreColor }} />
          </div>
        </div>
      ) : null}

      <div
        className={`grid gap-1 ${isReport ? "grid-cols-3 px-2.5 py-2" : "grid-cols-2 gap-1 px-2.5 py-2"}`}
      >
        {displayMetrics[0] ? (
          <div
            className={`flex items-center justify-between rounded-md ${
              isReport ? "col-span-3 px-2 py-1" : "col-span-2 px-2 py-1.5"
            }`}
            style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.18)" }}
          >
            <div className="flex min-w-0 items-center gap-1">
              {!isReport ? <TrendingUp size={11} style={{ color: "#10b981" }} /> : null}
              <span
                className={`truncate font-semibold uppercase tracking-wide text-[#10b981] ${
                  isReport ? "text-[9px]" : "text-[10px]"
                }`}
              >
                {tMetrics(METRIC_BY_KEY[displayMetrics[0]].label).toUpperCase()}
              </span>
            </div>
            <span className={`shrink-0 font-bold text-[#10b981] ${isReport ? "text-[11px]" : "text-xs"}`}>
              {formatMetricValue(displayMetrics[0], Number(metrics[displayMetrics[0]] ?? 0), locale)}
            </span>
          </div>
        ) : null}
        {displayMetrics.slice(1).map((key) => (
          <div
            key={key}
            className={`rounded-md bg-[var(--creator-card-bg-inset,var(--surface-bg))] ${isReport ? "px-1.5 py-1 text-center" : "px-2 py-1.5"}`}
          >
            <p
              className={`mb-0.5 truncate font-semibold uppercase tracking-wide text-[var(--text-dimmer)] ${
                isReport ? "text-[7px]" : "text-[9px]"
              }`}
            >
              {tMetrics(METRIC_BY_KEY[key].label)}
            </p>
            <p
              className={`truncate font-bold ${
                isReport ? "text-[10px]" : "text-xs"
              } ${key === primaryMetric ? "text-[var(--ui-accent)]" : "text-[var(--text-main)]"}`}
            >
              {formatMetricValue(key, Number(metrics[key] ?? 0), locale)}
            </p>
          </div>
        ))}
        {!isReport && displayMetrics[5] ? (
          <div
            className="col-span-2 flex items-center justify-between rounded-md px-2 py-1.5"
            style={{ background: "var(--ui-accent-muted)", border: "1px solid var(--ui-accent-border)" }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ui-accent)]">
              {tMetrics(METRIC_BY_KEY[displayMetrics[5]].label)}
            </span>
            <span className="text-xs font-bold text-[var(--ui-accent)]">
              {formatMetricValue(displayMetrics[5], Number(metrics[displayMetrics[5]] ?? 0), locale)}
            </span>
          </div>
        ) : null}
      </div>

      {!isReport ? (
      <div className="flex items-center gap-1.5 px-2.5 pb-2.5 pt-0.5">
        <button
          type="button"
          onClick={onPreview}
          className="ui-btn-accent-outline flex flex-1 items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-semibold"
        >
          <Eye size={12} />
          Ver Detalhes
        </button>
        {onCompare ? (
          <button
            type="button"
            onClick={onCompare}
            className="ui-btn-secondary inline-flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-semibold"
          >
            <BarChart2 size={12} />
            Comparar
          </button>
        ) : null}
      </div>
      ) : null}
    </div>
  );
}

export function CreativeRankingCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "overflow-hidden",
        compact
          ? "rounded-lg border"
          : "campaign-creator-card campaign-creator-card--compact !space-y-0 !p-0"
      )}
      style={compact ? { borderColor: "var(--border-color)", background: "var(--surface-card)" } : undefined}
    >
      <div className={`skeleton-shimmer w-full ${compact ? "report-creative-media min-h-[220px]" : "h-28"}`} />
      <div
        className={`space-y-1.5 border-b border-[var(--creator-card-border,var(--border-color))] ${compact ? "px-2.5 py-2" : "px-2.5 py-2"}`}
      >
        <div className={`skeleton-shimmer rounded ${compact ? "h-3 w-full" : "h-3 w-3/4"}`} />
        {!compact ? <div className="skeleton-shimmer h-2.5 w-1/2 rounded" /> : null}
      </div>
      <div className={`grid grid-cols-2 gap-1 ${compact ? "px-2.5 py-2" : "px-2.5 py-2"}`}>
        <div className={`skeleton-shimmer col-span-2 rounded-md ${compact ? "h-7" : "h-8"}`} />
        <div className={`skeleton-shimmer rounded-md ${compact ? "h-7" : "h-8"}`} />
        <div className={`skeleton-shimmer rounded-md ${compact ? "h-7" : "h-8"}`} />
      </div>
      {!compact ? (
        <div className="px-2.5 pb-2.5">
          <div className="skeleton-shimmer h-8 w-full rounded-md" />
        </div>
      ) : null}
    </div>
  );
}

export function CreativeRankingCardsSkeleton({
  count = 3,
  compact = false
}: {
  count?: number;
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? "grid grid-cols-1 gap-4 p-3 sm:grid-cols-2 lg:grid-cols-3"
          : "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      }
    >
      {Array.from({ length: count }).map((_, i) => (
        <CreativeRankingCardSkeleton key={i} compact={compact} />
      ))}
    </div>
  );
}
