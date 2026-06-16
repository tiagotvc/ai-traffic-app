"use client";

import { useTranslations } from "next-intl";

import { BrainListCard } from "@/components/agency-brain/BrainListCard";
import { Badge } from "@/components/ui/Badge";
import { Link } from "@/i18n/navigation";
import { formatConfidenceBadge } from "@/lib/agency-brain/confidence-score";
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
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
      <div className="font-medium text-slate-700">{t("evidenceTitle")}</div>
      {evidence.reason ? <p className="mt-1">{evidence.reason}</p> : null}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
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
  onEdit
}: {
  learning: LearningDto;
  clientId: string;
  actionLoadingId: string | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onArchive: (id: string) => void;
  onEdit: (learning: LearningDto) => void;
}) {
  const t = useTranslations("agencyBrain");
  const busy = actionLoadingId === learning.id;
  const tooltip = confidenceTooltip(learning, t);

  const badges = (
    <>
      <Badge variant={statusVariant(learning.status)}>{t(`status.${learning.status}`)}</Badge>
      <Badge>{t(`category.${learning.category}`)}</Badge>
      <Badge>{t(`impact.${learning.impact}`)}</Badge>
      {learning.confidenceScore != null ? (
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${confidenceScoreClass(learning.confidenceScore)}`}
          title={tooltip}
        >
          {t("confidenceScore", {
            score: formatConfidenceBadge(learning.confidenceScore)
          })}
        </span>
      ) : null}
    </>
  );

  return (
    <BrainListCard
      title={learning.title}
      badges={badges}
      createdAt={learning.createdAt}
      updatedAt={learning.updatedAt}
    >
      <p className="text-sm text-slate-600">{learning.description}</p>
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
        <span>{t(`source.${learning.source}`)}</span>
        <span>·</span>
        <span>{t(`confidence.${learning.confidence}`)}</span>
      </div>
      {learning.metaCampaignId ? (
        <div className="mt-2">
          <Link
            href={`/clients/${clientId}/campaigns?campaign=${encodeURIComponent(learning.metaCampaignId)}`}
            className="text-xs font-medium text-violet-600 hover:text-violet-800"
          >
            {t("viewCampaign")}
          </Link>
        </div>
      ) : null}
      {learning.tags.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {learning.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
      {learning.metricSnapshot ? (
        <div className="mt-2 text-xs text-slate-500">
          {formatMetrics(learning.metricSnapshot, t)}
        </div>
      ) : null}
      {learning.evidence ? <EvidenceBlock evidence={learning.evidence} t={t} /> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {learning.status === "SUGGESTED" ? (
          <>
            {(learning.confidenceScore ?? 0) < 50 ? (
              <p className="w-full text-xs text-amber-600">{t("approveLowConfidence")}</p>
            ) : null}
            <button
              type="button"
              className="ui-btn-primary text-xs"
              disabled={busy || (learning.confidenceScore ?? 0) < 50}
              onClick={() => onApprove(learning.id)}
            >
              {t("approveMemory")}
            </button>
            <button
              type="button"
              className="ui-btn-danger text-xs"
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
              className="ui-btn-secondary text-xs"
              disabled={busy}
              onClick={() => onEdit(learning)}
            >
              {t("edit")}
            </button>
            <button
              type="button"
              className="ui-btn-secondary text-xs"
              disabled={busy}
              onClick={() => onArchive(learning.id)}
            >
              {t("archive")}
            </button>
          </>
        ) : null}
      </div>
    </BrainListCard>
  );
}
