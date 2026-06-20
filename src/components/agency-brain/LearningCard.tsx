"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { formatConfidenceBadge } from "@/lib/agency-brain/confidence-score";
import {
  formatEvidenceLines,
  learningBodyText,
  suggestedAction,
  whyItMatters
} from "@/lib/agency-brain/learning-insight-copy";
import type { LearningDto } from "@/lib/agency-brain/types";

function Section({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-dim)]">{title}</p>
      <div className="mt-1.5 text-sm leading-relaxed text-[var(--text-dim)]">{children}</div>
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
  const busy = actionLoadingId === learning.id;
  const isSuggested = learning.status === "SUGGESTED";
  const isApproved = learning.status === "APPROVED";
  const lowConfidence = (learning.confidenceScore ?? 100) < 50;

  const evidenceLines = formatEvidenceLines(learning, t);
  const body = learningBodyText(learning);
  const action = suggestedAction(learning, t);
  const why = whyItMatters(learning, t);

  return (
    <article
      className={[
        "ui-card animate-slide-up overflow-hidden transition hover:shadow-md",
        isSuggested
          ? "border-amber-200/90 ring-1 ring-amber-100/80"
          : isApproved
            ? "border-emerald-200/70 ring-1 ring-emerald-100/60"
            : "border-[var(--border-color)]"
      ].join(" ")}
      style={{ animationDelay: `${Math.min(index, 9) * 35}ms` }}
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-2">
          <span className="text-lg leading-none" aria-hidden>
            💡
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-heading text-base font-semibold leading-snug text-[var(--text-main)] sm:text-[17px]">
              {learning.title}
            </h3>
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold">
              {isSuggested ? (
                <>
                  <span aria-hidden>🟡</span>
                  <span className="text-amber-800">{t("insightStatusSuggested")}</span>
                </>
              ) : isApproved ? (
                <>
                  <span aria-hidden>🟢</span>
                  <span className="text-emerald-800">{t("insightBadgeSaved")}</span>
                </>
              ) : (
                <span className="text-[var(--text-dim)]">{t(`status.${learning.status}`)}</span>
              )}
            </p>
          </div>
        </div>

        <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <div>
            <dt className="text-xs text-[var(--text-dim)]">{t("insightMetaImpact")}</dt>
            <dd
              className={[
                "font-semibold",
                learning.impact === "HIGH" ? "text-rose-700" : "text-[var(--text-main)]"
              ].join(" ")}
            >
              {t(`impact.${learning.impact}`)}
            </dd>
          </div>
          {learning.confidenceScore != null ? (
            <div>
              <dt className="text-xs text-[var(--text-dim)]">{t("insightMetaConfidence")}</dt>
              <dd className="font-semibold text-[var(--text-main)]">
                {formatConfidenceBadge(learning.confidenceScore)}/100
              </dd>
            </div>
          ) : null}
        </dl>

        {lowConfidence && isSuggested ? (
          <div className="mt-3 flex gap-2 rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-2">
            <span aria-hidden>⚠️</span>
            <div>
              <p className="text-xs font-semibold text-amber-900">{t("insightLowConfidenceTitle")}</p>
              <p className="text-[11px] text-amber-800">{t("insightLowConfidenceHint")}</p>
            </div>
          </div>
        ) : null}

        <div className="mt-4 space-y-4">
          <Section title={t("insightSectionLearning")}>{body}</Section>

          {isApproved && why !== body ? (
            <Section title={t("insightSectionWhy")}>{why}</Section>
          ) : null}

          {evidenceLines.length > 0 ? (
            <Section title={t("insightSectionEvidence")}>
              <ul className="space-y-1">
                {evidenceLines.map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <span className="mt-0.5 text-emerald-600" aria-hidden>
                      ✓
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          <Section title={isSuggested ? t("insightSectionAction") : t("insightSectionNextAction")}>
            <p className="font-medium text-[var(--violet)]">{action}</p>
          </Section>
        </div>

        {learning.metaCampaignId ? (
          <div className="mt-4">
            <Link
              href={`/clients/${clientId}/campaigns?campaign=${encodeURIComponent(learning.metaCampaignId)}`}
              className="text-xs ui-link font-semibold"
            >
              {t("viewCampaign")} →
            </Link>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--border-color)] pt-4">
          {isSuggested ? (
            <>
              <button
                type="button"
                className="ui-btn-primary !px-3 !py-1.5 text-xs"
                disabled={busy || lowConfidence}
                onClick={() => onApprove(learning.id)}
              >
                {t("approveMemory")}
              </button>
              <button
                type="button"
                className="ui-btn-secondary !px-3 !py-1.5 text-xs"
                disabled={busy}
                onClick={() => onReject(learning.id)}
              >
                {t("insightDismiss")}
              </button>
            </>
          ) : (
            <>
              {evidenceLines.length > 0 && learning.metaCampaignId ? (
                <Link
                  href={`/clients/${clientId}/campaigns?campaign=${encodeURIComponent(learning.metaCampaignId)}`}
                  className="ui-btn-secondary inline-flex !px-3 !py-1.5 text-xs"
                >
                  {t("insightViewEvidence")}
                </Link>
              ) : null}
              <button
                type="button"
                className="ui-btn-secondary !px-3 !py-1.5 text-xs"
                disabled={busy}
                onClick={() => onEdit(learning)}
              >
                {t("edit")}
              </button>
              {learning.status !== "ARCHIVED" ? (
                <button
                  type="button"
                  className="ui-btn-secondary !px-3 !py-1.5 text-xs"
                  disabled={busy}
                  onClick={() => onArchive(learning.id)}
                >
                  {t("archive")}
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </article>
  );
}
