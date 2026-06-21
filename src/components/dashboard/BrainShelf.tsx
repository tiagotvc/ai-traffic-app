"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Link } from "@/i18n/navigation";

type Suggestion = {
  id: string;
  type: "opportunity" | "alert" | "suggestion";
  title: string;
  body: string;
  action: string;
  actionHref?: string;
  confidence: number;
  color: string;
  border: string;
};

export function BrainShelf({
  suggestions,
  isLoading,
  compact = true
}: {
  suggestions?: Suggestion[];
  isLoading?: boolean;
  compact?: boolean;
}) {
  const t = useTranslations("dashboard");
  const [dismissed, setDismissed] = useState<string[]>([]);
  const visible = (suggestions ?? []).filter((s) => !dismissed.includes(s.id));

  return (
    <section className="ui-brain-shelf w-full">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
            style={{ background: "rgba(124,58,237,0.12)" }}
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="#7c3aed" strokeWidth={1.75}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="font-heading text-xs font-semibold" style={{ color: "var(--text-main)" }}>
              {t("brainLearningsTitle")}
            </h3>
            {!compact ? (
              <p className="text-[11px]" style={{ color: "var(--text-dimmer)" }}>
                {t("brainLearningsSubtitle")}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!isLoading && visible.length > 0 ? (
            <span className="text-[10px]" style={{ color: "var(--text-dimmer)" }}>
              {visible.length === 1
                ? t("brainSuggestionsCountOne")
                : t("brainSuggestionsCount", { count: visible.length })}
            </span>
          ) : null}
          <Link
            href="/agency-brain/learnings"
            className="text-[10px] font-medium transition-opacity hover:opacity-80"
            style={{ color: "#7c3aed" }}
          >
            {t("brainViewAll")}
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex gap-2 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="skeleton-shimmer h-[72px] min-w-[200px] flex-1 rounded-lg border"
              style={{ borderColor: "var(--border-color)" }}
            />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div
          className="rounded-lg border px-3 py-2.5 text-[11px]"
          style={{
            borderColor: "var(--border-color)",
            background: "var(--surface-bg)",
            color: "var(--text-dim)"
          }}
        >
          {t("brainEmpty")}
        </div>
      ) : (
        <div
          className="flex gap-2 overflow-x-auto pb-0.5"
          style={{ scrollbarWidth: "thin", scrollbarColor: "var(--scrollbar-color) transparent" }}
        >
          {visible.map((s, i) => (
            <Link
              key={s.id}
              href={s.actionHref ?? "/agency-brain/learnings"}
              className="group relative block min-w-[200px] max-w-[240px] flex-1 animate-fade-up rounded-lg p-2.5 transition-all"
              style={{
                background: "var(--surface-bg)",
                border: `1px solid ${s.border}`,
                animationDelay: `${i * 60}ms`,
                animationFillMode: "both"
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = `0 2px 12px ${s.color}22`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none";
              }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDismissed([...dismissed, s.id]);
                }}
                className="absolute right-1.5 top-1.5 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                style={{ color: "var(--text-dimmer)" }}
                aria-label={t("cancel")}
              >
                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <p
                className="line-clamp-1 pr-4 text-[11px] font-semibold leading-tight"
                style={{ color: "var(--text-main)", fontFamily: "var(--font-heading)" }}
              >
                {s.title}
              </p>
              <p className="mt-1 line-clamp-2 text-[10px] leading-snug" style={{ color: "var(--text-dim)" }}>
                {s.body}
              </p>
              <div className="mt-1.5 flex items-center gap-1.5">
                <div className="h-1 w-10 overflow-hidden rounded-full" style={{ background: "var(--border-color)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${s.confidence}%`, background: s.color }}
                  />
                </div>
                <span className="text-[9px]" style={{ color: "var(--text-dimmer)" }}>
                  {t("brainConfidence", { value: s.confidence })}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
