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

/** Remove sufixos de data/hash que a Meta coloca no nome do criativo. */
function cleanCreativeTitleForReport(title: string): string {
  return title
    .replace(/\s+\d{4}-\d{2}-\d{2}(?:-[a-f0-9]{8,})?\s*$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export type CreativeRankingCardProps = {
  rank: number;
  title: string;
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
  const displayTitle = isReport ? cleanCreativeTitleForReport(title) : title;
  const mediaHeight = isReport ? "h-28" : "h-40";

  return (
    <div
      className={`min-w-0 transition-all ${
        isReport ? "report-creative-card overflow-hidden rounded-lg" : "overflow-hidden rounded-xl hover:-translate-y-0.5"
      }`}
      style={{
        background: "var(--surface-card)",
        border: isFirst ? "1.5px solid rgba(245,166,35,0.5)" : "1px solid var(--border-color)",
        boxShadow: isFirst
          ? isReport
            ? "none"
            : "0 4px 24px rgba(245,166,35,0.1)"
          : isReport
            ? "none"
            : "0 1px 6px rgba(0,0,0,0.06)"
      }}
    >
      <div
        className={`relative overflow-hidden ${mediaHeight} ${
          coverPreview || isReport ? "bg-[var(--surface-bg)]" : "bg-[#0f1419]"
        } ${isReport ? "border-b border-[var(--border-color)]" : ""} ${
          !coverPreview && !isReport ? "flex items-center justify-center" : ""
        } ${isReport ? "flex items-center justify-center" : ""}`}
      >
        {imgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt={displayTitle}
            decoding="async"
            onError={handleImgError}
            className={
              coverPreview
                ? "absolute inset-0 z-0 block h-full w-full object-cover object-center"
                : "relative z-0 block max-h-full max-w-full object-contain object-center"
            }
          />
        ) : (
          <span
            className={`flex h-full w-full items-center justify-center opacity-40 ${isReport ? "text-xl" : "text-3xl"}`}
          >
            🖼️
          </span>
        )}
        <div
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.35) 100%)" }}
        />
        <div
          className={`absolute z-[2] flex items-center justify-center rounded-full font-bold shadow-md ${
            isReport ? "left-1.5 top-1.5 h-5 w-5 text-[9px]" : "left-3 top-3 h-8 w-8 text-xs shadow-lg"
          }`}
          style={{
            background: isTop3 ? rankColors[rank - 1] : "rgba(15,20,25,0.7)",
            color: "#fff",
            border: "1.5px solid rgba(255,255,255,0.35)"
          }}
        >
          {isFirst ? <Star size={isReport ? 9 : 13} fill="#fff" color="#fff" /> : `#${rank}`}
        </div>
        {!isReport ? (
          <>
            <div
              className="absolute right-3 top-3 z-[2] flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold"
              style={{ background: "rgba(0,0,0,0.6)", color: "#fff", backdropFilter: "blur(4px)" }}
            >
              {creativeType === "Video" && <Video size={11} />}
              {creativeType === "Imagem" && <Image size={11} />}
              {creativeType === "Carrossel" && <LayoutGrid size={11} />}
              {creativeType}
            </div>
            <div
              className="absolute bottom-3 right-3 z-[2] flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{
                background: statusLabel === "Ativo" ? "rgba(16,185,129,0.85)" : "rgba(239,68,68,0.85)",
                color: "#fff"
              }}
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-white" />
              {statusLabel}
            </div>
            {campaignType ? (
              <div
                className="absolute bottom-3 left-3 z-[2] rounded-full px-2.5 py-1 text-xs font-medium"
                style={{ background: "rgba(245,166,35,0.85)", color: "#0f1419" }}
              >
                {campaignType}
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <div className={`border-b border-[var(--border-color)] ${isReport ? "px-2 py-1.5" : "px-4 py-3"}`}>
        <div className={isReport ? "flex items-start justify-between gap-1.5" : undefined}>
          <p
            className={`min-w-0 font-semibold leading-snug text-[var(--text-main)] ${
              isReport ? "line-clamp-3 break-words text-[10px]" : "mb-1 line-clamp-1 text-sm"
            }`}
            title={displayTitle}
          >
            {displayTitle}
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
          <p className="text-xs text-[var(--text-dimmer)]">Usado em {campaignsUsed} campanha(s)</p>
        ) : null}
      </div>

      {!isReport ? (
        <div className="border-b border-[var(--border-color)] px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">Score</span>
            <div className="flex items-center gap-2">
              <span
                className="rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ background: `${scoreColor}18`, color: scoreColor }}
              >
                {scoreLabel}
              </span>
              <span className="text-base font-bold" style={{ color: scoreColor }}>
                {score}
              </span>
            </div>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-bg)]">
            <div className="h-full rounded-full" style={{ width: `${score}%`, background: scoreColor }} />
          </div>
        </div>
      ) : null}

      <div
        className={`grid gap-2 ${isReport ? "grid-cols-2 px-2.5 py-2" : "grid-cols-2 px-4 py-3"}`}
      >
        {displayMetrics[0] ? (
          <div
            className={`flex items-center justify-between rounded-lg ${
              isReport ? "col-span-2 px-2 py-1.5" : "col-span-2 px-3 py-2"
            }`}
            style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.18)" }}
          >
            <div className="flex min-w-0 items-center gap-1">
              {!isReport ? <TrendingUp size={13} style={{ color: "#10b981" }} /> : null}
              <span
                className={`truncate font-semibold uppercase tracking-wide text-[#10b981] ${
                  isReport ? "text-[9px]" : "text-xs"
                }`}
              >
                {tMetrics(METRIC_BY_KEY[displayMetrics[0]].label).toUpperCase()}
              </span>
            </div>
            <span className={`shrink-0 font-bold text-[#10b981] ${isReport ? "text-[11px]" : "text-sm"}`}>
              {formatMetricValue(displayMetrics[0], Number(metrics[displayMetrics[0]] ?? 0), locale)}
            </span>
          </div>
        ) : null}
        {displayMetrics.slice(1).map((key) => (
          <div
            key={key}
            className={`rounded-lg bg-[var(--surface-bg)] ${isReport ? "px-2 py-1.5" : "px-3 py-2"}`}
          >
            <p
              className={`mb-0.5 truncate font-semibold uppercase tracking-wide text-[var(--text-dimmer)] ${
                isReport ? "text-[8px]" : "text-[10px]"
              }`}
            >
              {tMetrics(METRIC_BY_KEY[key].label)}
            </p>
            <p
              className={`truncate font-bold ${
                isReport ? "text-[11px]" : "text-sm"
              } ${key === primaryMetric ? "text-[var(--amber)]" : "text-[var(--text-main)]"}`}
            >
              {formatMetricValue(key, Number(metrics[key] ?? 0), locale)}
            </p>
          </div>
        ))}
        {!isReport && displayMetrics[5] ? (
          <div
            className="col-span-2 flex items-center justify-between rounded-lg px-3 py-2"
            style={{ background: "rgba(245,166,35,0.07)", border: "1px solid rgba(245,166,35,0.18)" }}
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--amber)]">
              {tMetrics(METRIC_BY_KEY[displayMetrics[5]].label)}
            </span>
            <span className="text-sm font-bold text-[var(--amber)]">
              {formatMetricValue(displayMetrics[5], Number(metrics[displayMetrics[5]] ?? 0), locale)}
            </span>
          </div>
        ) : null}
      </div>

      {!isReport ? (
      <div className="flex items-center gap-2 px-4 pb-4">
        <button
          type="button"
          onClick={onPreview}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all"
          style={{
            background: "rgba(245,166,35,0.12)",
            color: "var(--amber)",
            border: "1px solid rgba(245,166,35,0.3)"
          }}
        >
          <Eye size={13} />
          Ver Detalhes
        </button>
        {onCompare ? (
          <button
            type="button"
            onClick={onCompare}
            className="flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold text-[var(--text-dim)]"
            style={{ borderColor: "var(--border-color)", background: "var(--surface-bg)" }}
          >
            <BarChart2 size={13} />
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
      className="overflow-hidden rounded-lg border"
      style={{ borderColor: "var(--border-color)", background: "var(--surface-card)" }}
    >
      <div className={`skeleton-shimmer w-full ${compact ? "h-28" : "h-40"}`} />
      <div
        className={`space-y-2 border-b border-[var(--border-color)] ${compact ? "px-2.5 py-2" : "px-4 py-3"}`}
      >
        <div className={`skeleton-shimmer rounded ${compact ? "h-3 w-full" : "h-4 w-3/4"}`} />
        {!compact ? <div className="skeleton-shimmer h-3 w-1/2 rounded" /> : null}
      </div>
      <div className={`grid grid-cols-2 gap-2 ${compact ? "px-2.5 py-2" : "px-4 py-3"}`}>
        <div className={`skeleton-shimmer col-span-2 rounded-lg ${compact ? "h-7" : "h-10"}`} />
        <div className={`skeleton-shimmer rounded-lg ${compact ? "h-7" : "h-10"}`} />
        <div className={`skeleton-shimmer rounded-lg ${compact ? "h-7" : "h-10"}`} />
      </div>
      {!compact ? (
        <div className="px-4 pb-4">
          <div className="skeleton-shimmer h-9 w-full rounded-lg" />
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
      className={compact ? "grid grid-cols-3 gap-2 p-2" : "grid gap-4 p-4"}
      style={compact ? undefined : { gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <CreativeRankingCardSkeleton key={i} compact={compact} />
      ))}
    </div>
  );
}
