"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { CreatedAtMeta } from "@/components/agency-brain/CreatedAtMeta";
import { Badge } from "@/components/ui/Badge";
import { Link } from "@/i18n/navigation";
import { formatConfidenceBadge } from "@/lib/agency-brain/confidence-score";
import { getCategoryVisual } from "@/lib/agency-brain/learning-visuals";
import type { EvidencePayload, LearningDto, MetricSnapshotPayload } from "@/lib/agency-brain/types";

function confidenceScoreClass(score: number | null): string {
  if (score == null) return "bg-slate-100 text-slate-600";
  if (score >= 80) return "bg-green-100 text-green-800";
  if (score >= 50) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
}

function statusVariant(status: LearningDto["status"]): "neutral" | "success" | "warning" | "danger" {
  switch (status) {
    case "APPROVED":
      return "success";
    case "SUGGESTED":
      return "warning";
    case "REJECTED":
      return "danger";
    default:
      return "neutral";
  }
}

function formatMetrics(snapshot: MetricSnapshotPayload, t: ReturnType<typeof useTranslations>): string {
  return [
    snapshot.cpa != null ? t("metricCpa", { value: snapshot.cpa.toFixed(2) }) : null,
    snapshot.ctr != null ? t("metricCtr", { value: snapshot.ctr.toFixed(2) }) : null,
    snapshot.roas != null ? t("metricRoas", { value: snapshot.roas.toFixed(2) }) : null,
    snapshot.spend != null ? t("metricSpend", { value: snapshot.spend.toFixed(0) }) : null
  ]
    .filter(Boolean)
    .join(" · ");
}

function confidenceTooltip(
  learning: LearningDto,
  t: ReturnType<typeof useTranslations>
): string | undefined {
  if (learning.confidenceScore == null) return undefined;

  const parts: string[] = [];
  const snap = learning.metricSnapshot;
  const evidence = learning.evidence;

  if (snap?.conversions != null) {
    parts.push(t("confidenceTooltipConversions", { value: snap.conversions }));
  }
  if (evidence?.deltaPercent != null) {
    parts.push(t("confidenceTooltipDelta", { value: evidence.deltaPercent.toFixed(0) }));
  }
  if (snap?.spend != null) {
    parts.push(t("confidenceTooltipSpend", { value: snap.spend.toFixed(0) }));
  }

  return parts.length > 0 ? parts.join(" · ") : undefined;
}

function EvidenceBlock({
  evidence,
  t
}: {
  evidence: EvidencePayload;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="mt-2 rounded-lg border border-slate-200 bg-white/80 p-2.5 text-xs text-slate-600">
      <div className="font-medium text-slate-700">{t("evidenceTitle")}</div>
      {evidence.reason ? <p className="mt-1">{evidence.reason}</p> : null}
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
        {evidence.ruleId ? <span>{t("evidenceRule", { rule: evidence.ruleId })}</span> : null}
        {evidence.campaignName ? (
          <span>{t("evidenceCampaign", { name: evidence.campaignName })}</span>
        ) : null}
        {evidence.deltaPercent != null ? (
          <span>{t("evidenceDelta", { value: evidence.deltaPercent.toFixed(0) })}</span>
        ) : null}
        {evidence.baselineValue != null && evidence.actualValue != null ? (
          <span>
            {t("evidenceCompare", {
              baseline: evidence.baselineValue.toFixed(2),
              actual: evidence.actualValue.toFixed(2)
            })}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function LearningCard({
  learning,
  clientId,
  actionLoadingId,
  onApprove,
  onReject,
  onArchive,
  onEdit,
  index = 0
}: {
  learning: LearningDto;
  clientId: string;
  actionLoadingId: string | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onArchive: (id: string) => void;
  onEdit: (learning: LearningDto) => void;
  index?: number;
}) {
  const t = useTranslations("agencyBrain");
  const [expanded, setExpanded] = useState(false);
  const busy = actionLoadingId === learning.id;
  const tooltip = confidenceTooltip(learning, t);
  const visual = getCategoryVisual(learning.category);

  return (
    <article
      className={`animate-slide-up overflow-hidden rounded-xl border border-slate-300 border-l-4 ${visual.border} ${visual.bg} shadow-sm transition hover:border-violet-300 hover:shadow-md hover:shadow-violet-100/50`}
      style={{ animationDelay: `${Math.min(index, 9) * 35}ms` }}
    >
      <div className="flex items-start gap-2 p-2.5 sm:p-3">
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${visual.dot}`} aria-hidden />
            <h3 className="truncate text-sm font-semibold text-slate-900">{learning.title}</h3>
          </div>
          {!expanded ? (
            <div className="mt-1 flex flex-wrap items-center gap-1">
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${visual.badge}`}>
                {t(`category.${learning.category}`)}
              </span>
              <Badge variant={statusVariant(learning.status)}>
                {t(`status.${learning.status}`)}
              </Badge>
              {learning.confidenceScore != null ? (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${confidenceScoreClass(learning.confidenceScore)}`}
                  title={tooltip}
                >
                  {formatConfidenceBadge(learning.confidenceScore)}
                </span>
              ) : null}
            </div>
          ) : null}
          {!expanded ? (
            <CreatedAtMeta
              createdAt={learning.createdAt}
              updatedAt={learning.updatedAt}
              className="mt-0.5 !text-[10px]"
            />
          ) : null}
        </button>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <button
            type="button"
            className="rounded p-0.5 text-slate-400 transition hover:bg-white/60 hover:text-slate-600"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? t("collapseCard") : t("expandCard")}
          >
            <svg
              className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="animate-fade-in border-t border-white/60 px-2.5 pb-2.5 pt-2 sm:px-3 sm:pb-3">
          <CreatedAtMeta
            createdAt={learning.createdAt}
            updatedAt={learning.updatedAt}
            className="mb-1.5 !text-[10px]"
          />
          <div className="mb-2 flex flex-wrap gap-1">
            <Badge variant={statusVariant(learning.status)}>
              {t(`status.${learning.status}`)}
            </Badge>
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${visual.badge}`}>
              {t(`category.${learning.category}`)}
            </span>
            <span className="rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] text-slate-600">
              {t(`impact.${learning.impact}`)}
            </span>
            {learning.confidenceScore != null ? (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${confidenceScoreClass(learning.confidenceScore)}`}
                title={tooltip}
              >
                {t("confidenceScore", {
                  score: formatConfidenceBadge(learning.confidenceScore)
                })}
              </span>
            ) : null}
          </div>

          <p className="text-xs leading-relaxed text-slate-600">{learning.description}</p>
          <div className="mt-1.5 flex flex-wrap gap-2 text-[10px] text-slate-400">
            <span>{t(`source.${learning.source}`)}</span>
            <span>·</span>
            <span>{t(`confidence.${learning.confidence}`)}</span>
          </div>
          {learning.metaCampaignId ? (
            <div className="mt-1.5">
              <Link
                href={`/clients/${clientId}/campaigns?campaign=${encodeURIComponent(learning.metaCampaignId)}`}
                className="text-[11px] font-medium text-violet-600 hover:text-violet-800"
              >
                {t("viewCampaign")}
              </Link>
            </div>
          ) : null}
          {learning.tags.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {learning.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] text-slate-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
          {learning.metricSnapshot ? (
            <div className="mt-1.5 text-[10px] text-slate-500">
              {formatMetrics(learning.metricSnapshot, t)}
            </div>
          ) : null}
          {learning.evidence ? <EvidenceBlock evidence={learning.evidence} t={t} /> : null}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {learning.status === "SUGGESTED" ? (
              <>
                {(learning.confidenceScore ?? 0) < 50 ? (
                  <p className="w-full text-[10px] text-amber-600">{t("approveLowConfidence")}</p>
                ) : null}
                <button
                  type="button"
                  className="ui-btn-primary !px-2.5 !py-1 text-[11px]"
                  disabled={busy || (learning.confidenceScore ?? 0) < 50}
                  onClick={() => onApprove(learning.id)}
                >
                  {t("approveMemory")}
                </button>
                <button
                  type="button"
                  className="ui-btn-danger !px-2.5 !py-1 text-[11px]"
                  disabled={busy}
                  onClick={() => onReject(learning.id)}
                >
                  {t("reject")}
                </button>
              </>
            ) : null}
            {learning.status !== "ARCHIVED" ? (
              <>
                <button
                  type="button"
                  className="ui-btn-secondary !px-2.5 !py-1 text-[11px]"
                  disabled={busy}
                  onClick={() => onEdit(learning)}
                >
                  {t("edit")}
                </button>
                <button
                  type="button"
                  className="ui-btn-secondary !px-2.5 !py-1 text-[11px]"
                  disabled={busy}
                  onClick={() => onArchive(learning.id)}
                >
                  {t("archive")}
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}
