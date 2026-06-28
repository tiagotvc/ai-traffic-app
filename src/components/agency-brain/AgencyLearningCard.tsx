"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { CreatedAtMeta } from "@/components/agency-brain/CreatedAtMeta";
import { Badge } from "@/components/ui/Badge";
import { Link } from "@/i18n/navigation";
import { formatConfidenceBadge } from "@/lib/agency-brain/confidence-score";
import type { AgencyLearningDto } from "@/lib/agency-brain/agency-learnings-service";
import { getCategoryVisual } from "@/lib/agency-brain/learning-visuals";

function confidenceScoreClass(score: number | null): string {
  if (score == null) return "bg-[var(--surface-thead)] text-[var(--text-dim)]";
  if (score >= 80) return "bg-green-100 text-green-800";
  if (score >= 50) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
}

export function AgencyLearningCard({
  learning,
  index = 0
}: {
  learning: AgencyLearningDto;
  index?: number;
}) {
  const t = useTranslations("agencyBrain");
  const [expanded, setExpanded] = useState(false);
  const visual = getCategoryVisual(learning.category);

  return (
    <article
      className={`campaign-creator-card campaign-creator-card--compact animate-slide-up overflow-hidden border-l-4 ${visual.border} p-0 transition hover:border-[var(--ui-accent-border)]`}
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
            <h3 className="truncate text-sm font-semibold text-[var(--text-main)]">{learning.title}</h3>
            <Link
              href={`/agency-brain/learnings?client=${encodeURIComponent(learning.clientSlug)}`}
              className="shrink-0 rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-800 hover:bg-sky-200"
              onClick={(e) => e.stopPropagation()}
            >
              {learning.clientName}
            </Link>
          </div>
          {!expanded ? (
            <div className="mt-1 flex flex-wrap items-center gap-1">
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${visual.badge}`}>
                {t(`category.${learning.category}`)}
              </span>
              <Badge variant="success">{t(`status.${learning.status}`)}</Badge>
              {learning.confidenceScore != null ? (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${confidenceScoreClass(learning.confidenceScore)}`}
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

        <button
          type="button"
          className="shrink-0 rounded p-0.5 text-[var(--text-dimmer)] transition hover:bg-white/60 hover:text-[var(--text-dim)]"
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

      {expanded ? (
        <div className="animate-fade-in border-t border-white/60 px-2.5 pb-2.5 pt-2 sm:px-3 sm:pb-3">
          <CreatedAtMeta
            createdAt={learning.createdAt}
            updatedAt={learning.updatedAt}
            className="mb-1.5 !text-[10px]"
          />
          <div className="mb-2 flex flex-wrap gap-1">
            <Badge variant="success">{t(`status.${learning.status}`)}</Badge>
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${visual.badge}`}>
              {t(`category.${learning.category}`)}
            </span>
            <span className="rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] text-[var(--text-dim)]">
              {t(`impact.${learning.impact}`)}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-[var(--text-dim)]">{learning.description}</p>
          <div className="mt-1.5 flex flex-wrap gap-2 text-[10px] text-[var(--text-dimmer)]">
            <span>{t(`source.${learning.source}`)}</span>
            <span>·</span>
            <span>{t(`confidence.${learning.confidence}`)}</span>
          </div>
          {learning.tags.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {learning.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] text-[var(--text-dim)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
