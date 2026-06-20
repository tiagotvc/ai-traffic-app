"use client";

import { useLocale, useTranslations } from "next-intl";

import { EvidenceSourcePill } from "@/components/agency-brain/insights/EvidenceSources";
import type { LearningTimelineEvent } from "@/lib/agency-brain/insights/types";

const EVENT_STYLES: Record<string, string> = {
  created: "border-[rgba(124,58,237,0.2)] bg-[rgba(124,58,237,0.06)]/50",
  reinforced: "border-emerald-200 bg-emerald-50/40",
  weakened: "border-amber-200 bg-amber-50/40",
  hypothesis_validated: "border-emerald-200 bg-emerald-50/50",
  hypothesis_rejected: "border-rose-200 bg-rose-50/40",
  market_signal: "border-sky-200 bg-sky-50/40",
  competitor_signal: "border-amber-200 bg-amber-50/40",
  agency_pattern: "border-[rgba(124,58,237,0.2)] bg-[rgba(124,58,237,0.06)]/40",
  client_pattern: "border-blue-200 bg-blue-50/40"
};

function formatDate(date: string, locale: string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString(locale, { day: "2-digit", month: "short" });
}

function confidenceDelta(event: LearningTimelineEvent): string | null {
  if (event.confidenceBefore == null && event.confidenceAfter == null) return null;
  if (event.confidenceBefore == null) return `${event.confidenceAfter}%`;
  return `${event.confidenceBefore}% → ${event.confidenceAfter}%`;
}

export function LearningTimeline({ events }: { events: LearningTimelineEvent[] }) {
  const t = useTranslations("brainInsights");
  const locale = useLocale();

  if (events.length === 0) {
    return <p className="text-sm text-[var(--text-dim)]">{t("timelineEmpty")}</p>;
  }

  return (
    <ol className="space-y-0">
      {events.map((event, index) => {
        const delta = confidenceDelta(event);
        const cardStyle = EVENT_STYLES[event.eventType] ?? "border-[var(--border-color)] bg-[var(--surface-thead)]";

        return (
          <li key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
            {index < events.length - 1 ? (
              <span
                className="absolute left-[5.5rem] top-8 h-[calc(100%-1rem)] w-px bg-[var(--border-color)]"
                aria-hidden
              />
            ) : null}
            <time className="w-14 shrink-0 pt-0.5 text-xs font-semibold tabular-nums text-[var(--text-dim)]">
              {formatDate(event.date, locale)}
            </time>
            <div className={`min-w-0 flex-1 rounded-lg border px-4 py-3 ${cardStyle}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm font-semibold text-[var(--text-main)]">{event.title}</p>
                {delta ? (
                  <span className="shrink-0 rounded-md bg-white/80 px-2 py-0.5 text-xs font-bold tabular-nums text-violet-700">
                    {delta}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs font-medium text-[var(--text-dim)]">
                {t(`eventType.${event.eventType}`)}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-dim)]">{event.description}</p>
              {event.sourceType && event.sourceDetail ? (
                <div className="mt-2">
                  <EvidenceSourcePill
                    source={{
                      type: event.sourceType,
                      label: t(`sourceType.${event.sourceType}`),
                      detail: event.sourceDetail
                    }}
                    compact
                  />
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
