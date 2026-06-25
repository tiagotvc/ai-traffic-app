"use client";

import { useEffect, useState, type ElementType } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Brain,
  Calendar,
  CheckCircle,
  Globe,
  Lightbulb,
  Target,
  TrendingUp,
  X
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import type { InsightLearning, LearningTimelineEvent, TimelineEventType } from "@/lib/agency-brain/insights/types";

const timelineTypeConfig: Record<
  TimelineEventType,
  { icon: ElementType; color: string; bg: string }
> = {
  created: { icon: Lightbulb, color: "#f5a623", bg: "rgba(245,166,35,0.12)" },
  reinforced: { icon: CheckCircle, color: "#059669", bg: "rgba(5,150,105,0.12)" },
  weakened: { icon: AlertTriangle, color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  hypothesis_validated: { icon: CheckCircle, color: "#059669", bg: "rgba(5,150,105,0.12)" },
  hypothesis_rejected: { icon: AlertTriangle, color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  market_signal: { icon: Globe, color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  competitor_signal: { icon: Target, color: "#f5a623", bg: "rgba(245,166,35,0.12)" },
  agency_pattern: { icon: BookOpen, color: "#7c3aed", bg: "rgba(124,58,237,0.12)" },
  client_pattern: { icon: TrendingUp, color: "#1877F2", bg: "rgba(24,119,242,0.12)" }
};

function formatEventDate(date: string, locale: string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
}

function formatUpdatedAt(date: string, locale: string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
}

function ConfidenceBar({ score }: { score: number }) {
  return (
    <div className="h-1.5 w-20 overflow-hidden rounded-full" style={{ background: "var(--border-hover)" }}>
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.min(100, Math.max(0, score))}%`,
          background:
            score >= 85
              ? "linear-gradient(90deg,#FACC15,#f5a623)"
              : score >= 60
                ? "linear-gradient(90deg,#f5a623,#e8920d)"
                : "var(--text-dimmer)"
        }}
      />
    </div>
  );
}

export function LearningTimelinePanel({
  learning,
  events,
  onClose
}: {
  learning: InsightLearning;
  events: LearningTimelineEvent[];
  onClose: () => void;
}) {
  const t = useTranslations("brainInsights");
  const locale = useLocale();
  const [mounted, setMounted] = useState(false);

  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[199]"
        style={{ background: "rgba(15,20,25,0.55)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="fixed bottom-0 right-0 top-0 z-[200] flex w-full max-w-[440px] flex-col shadow-[-8px_0_40px_rgba(0,0,0,0.18)]"
        style={{
          background: "var(--surface-card)",
          borderLeft: "1px solid var(--border-color)"
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="learning-timeline-title"
      >
        <div className="h-1 shrink-0" style={{ background: "linear-gradient(90deg,#f5a623,#e8920d)" }} />

        <div
          className="flex shrink-0 items-start justify-between gap-3 border-b px-5 py-4 sm:px-6"
          style={{ borderColor: "var(--border-color)" }}
        >
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-sm"
                style={{ background: "linear-gradient(135deg, #f5a623, #e8920d)" }}
              >
                <Brain size={15} className="text-[#0f1419]" />
              </div>
              <span
                className="text-[11px] font-bold uppercase tracking-[0.14em]"
                style={{ color: "var(--amber)", fontFamily: "var(--font-heading)" }}
              >
                {t("timelineTitle")}
              </span>
            </div>
            <h2
              id="learning-timeline-title"
              className="text-[15px] font-semibold leading-snug text-[var(--text-main)]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {learning.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors hover:bg-[var(--row-hover)]"
            style={{ borderColor: "var(--border-color)", color: "var(--text-dim)" }}
            aria-label={t("timelineClose")}
          >
            <X size={16} />
          </button>
        </div>

        <div
          className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b px-5 py-3 sm:px-6"
          style={{ borderColor: "var(--border-color)", background: "var(--surface-bg)" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-dimmer)]">{t("confidenceLabel")}</span>
            <span
              className="text-xs font-bold tabular-nums text-[var(--text-main)]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {learning.confidenceScore}%
            </span>
            <ConfidenceBar score={learning.confidenceScore} />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-dimmer)]">
            <Calendar size={12} style={{ color: "var(--amber)" }} />
            {t("timelineUpdatedAt", { date: formatUpdatedAt(learning.updatedAt, locale) })}
          </div>
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6"
          style={{ scrollbarWidth: "thin", scrollbarColor: "var(--scrollbar-color) transparent" }}
        >
          {sortedEvents.length === 0 ? (
            <div
              className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 text-center"
              style={{ borderColor: "var(--border-color)", background: "var(--surface-bg)" }}
            >
              <div
                className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
                style={{ background: "rgba(245,166,35,0.12)" }}
              >
                <Lightbulb size={20} style={{ color: "var(--amber)" }} />
              </div>
              <p className="text-sm text-[var(--text-dim)]">{t("timelineEmpty")}</p>
            </div>
          ) : (
            <div className="relative pb-2">
              <div
                className="absolute bottom-3 left-5 top-3 w-px"
                style={{ background: "var(--border-color)" }}
              />
              <div className="space-y-6">
                {sortedEvents.map((event) => {
                  const cfg = timelineTypeConfig[event.eventType];
                  const Icon = cfg.icon;
                  return (
                    <div key={event.id} className="relative flex gap-4 pl-0.5">
                      <div
                        className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 shadow-sm"
                        style={{
                          background: cfg.bg,
                          borderColor: `${cfg.color}55`
                        }}
                      >
                        <Icon size={16} style={{ color: cfg.color }} />
                      </div>
                      <div className="min-w-0 flex-1 rounded-xl border px-4 py-3" style={{ borderColor: "var(--border-color)", background: "var(--surface-bg)" }}>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span
                            className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                            style={{ background: cfg.bg, color: cfg.color }}
                          >
                            {formatEventDate(event.date, locale)}
                          </span>
                          <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-dimmer)]">
                            {t(`eventType.${event.eventType}`)}
                          </span>
                        </div>
                        <h4
                          className="mb-1.5 text-sm font-semibold leading-snug text-[var(--text-main)]"
                          style={{ fontFamily: "var(--font-heading)" }}
                        >
                          {event.title}
                        </h4>
                        <p className="text-xs leading-relaxed text-[var(--text-dim)]">{event.description}</p>

                        {event.evidence?.competitors?.length ? (
                          <div className="mt-2.5">
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
                              {t("timelineCompetitors")}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {event.evidence.competitors.map((c) => (
                                <span
                                  key={c}
                                  className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
                                  style={{
                                    background: "rgba(245,166,35,0.08)",
                                    borderColor: "rgba(245,166,35,0.22)",
                                    color: "var(--amber)"
                                  }}
                                >
                                  {c}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {event.evidence?.patterns?.length ? (
                          <ul className="mt-2.5 space-y-1">
                            {event.evidence.patterns.slice(0, 4).map((p) => (
                              <li key={p} className="flex items-start gap-1.5 text-[11px] text-[var(--text-dim)]">
                                <span className="mt-0.5 text-[var(--amber)]" aria-hidden>•</span>
                                <span>{p}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}

                        {event.evidence?.sampleAdUrls?.length ? (
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {event.evidence.sampleAdUrls.slice(0, 5).map((u, i) => (
                              <a
                                key={u}
                                href={u}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors hover:bg-[var(--row-hover)]"
                                style={{ borderColor: "var(--border-color)", color: "var(--violet-bright)" }}
                              >
                                <Globe size={10} />
                                {t("timelineSampleAd")} {i + 1}
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div
          className="mt-auto flex shrink-0 items-center gap-3 border-t px-5 py-4 sm:px-6"
          style={{
            borderColor: "var(--border-color)",
            background: "var(--surface-card)",
            boxShadow: "0 -4px 24px rgba(15,20,25,0.06)"
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--surface-bg)]"
            style={{
              borderColor: "var(--border-color)",
              color: "var(--text-dim)"
            }}
          >
            <ArrowLeft size={15} />
            {t("timelineBack")}
          </button>
        </div>
      </aside>
    </>,
    document.body
  );
}
