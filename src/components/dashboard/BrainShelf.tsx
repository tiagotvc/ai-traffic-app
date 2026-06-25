"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Sparkles, X } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

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
  variant = "feed",
  embedded = false,
  metaLine,
  hypothesesCount = 0,
  suggestionsCount,
  learningsCount = 0
}: {
  suggestions?: Suggestion[];
  isLoading?: boolean;
  /** feed = compact alert rows (canvas). shelf = legacy card strip. notice = highlights teaser only. */
  variant?: "feed" | "shelf" | "notice";
  embedded?: boolean;
  metaLine?: string;
  hypothesesCount?: number;
  suggestionsCount?: number;
  learningsCount?: number;
}) {
  const t = useTranslations("dashboard");
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const visible = (suggestions ?? []).filter((s) => !dismissed.includes(s.id));
  const isFeed = variant === "feed";
  const isNotice = variant === "notice";
  const visibleCount = suggestionsCount ?? visible.length;
  const hasPending = hypothesesCount > 0 || learningsCount > 0 || visibleCount > 0;
  // Alert badge count: pending learnings + hypotheses (drives the pulsing number).
  const alertCount = learningsCount + hypothesesCount;

  if (isNotice && !isLoading && !hasPending) return null;
  if (isNotice && noticeDismissed) return null;

  const shellClass = cn(
    "w-full",
    !embedded && !isFeed && !isNotice && "ui-brain-shelf",
    (isFeed || isNotice) && "rounded-xl border p-4",
    (isFeed || isNotice) && !embedded && "shadow-sm"
  );

  const shellStyle = isFeed || isNotice
    ? {
        borderColor: "var(--border-color)",
        background: "var(--surface-card)",
        boxShadow: embedded ? undefined : "0 1px 8px rgba(0,0,0,0.05)"
      }
    : undefined;

  const subtitle =
    metaLine ??
    (hypothesesCount > 0
      ? t("brainSummaryHypotheses", { count: hypothesesCount })
      : t("brainLearningsSubtitle"));

  if (isNotice) {
    // ALERT CARD (tipo "alerta"). Padrão reaproveitável pelo módulo Visão:
    //  - ícone à esquerda (fixo aqui no dash; editável no Visão)
    //  - badge numérico pulsante indicando que é um alerta (qtd. de aprendizados/hipóteses)
    //  - CTA dependente do tipo de alerta, ancorado à direita no fim do card
    //  - botão de fechar (dispensável aqui e, no futuro, persistido no Visão)
    return (
      <div
        className={cn(shellClass, "group flex h-full w-full items-center")}
        style={shellStyle}
      >
        {isLoading ? (
          <div className="skeleton-shimmer h-12 w-full rounded-lg" />
        ) : (
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                style={{ background: "rgba(124,58,237,0.12)" }}
              >
                <Sparkles size={14} style={{ color: "#7c3aed" }} />
              </div>
              {alertCount > 0 ? (
                <span
                  className="relative flex h-6 min-w-[24px] shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums"
                  style={{ background: "rgba(124,58,237,0.14)", color: "#7c3aed" }}
                  aria-label={t("brainAlertCount", { count: alertCount })}
                >
                  <span
                    className="absolute inset-0 animate-ping rounded-full"
                    style={{ background: "rgba(124,58,237,0.35)" }}
                  />
                  <span className="relative">{alertCount}</span>
                </span>
              ) : null}
              <div className="min-w-0">
                <p className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
                  {t("brainNoticeTitle")}
                </p>
                <p className="text-[11px]" style={{ color: "var(--text-dim)" }}>
                  {t("brainNoticeHint")}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Link
                href="/agency-brain/learnings"
                className="text-[11px] font-medium transition-opacity hover:opacity-80"
                style={{ color: "#7c3aed" }}
              >
                {t("brainViewAll")}
              </Link>
              <button
                type="button"
                onClick={() => setNoticeDismissed(true)}
                className="rounded-md p-1 transition-colors hover:bg-[var(--surface-bg)]"
                style={{ color: "var(--text-dimmer)" }}
                aria-label={t("cancel")}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <section className={shellClass} style={shellStyle}>
      <div className={cn("flex flex-wrap items-center justify-between gap-2", isFeed ? "mb-3" : "mb-2")}>
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
            style={{ background: "rgba(124,58,237,0.12)" }}
          >
            <Sparkles size={14} style={{ color: "#7c3aed" }} />
          </div>
          <div className="min-w-0">
            <h3
              className={cn("font-heading font-semibold", isFeed ? "text-sm" : "text-xs")}
              style={{ color: "var(--text-main)" }}
            >
              {t("brainLearningsTitle")}
            </h3>
            <p className="text-[11px]" style={{ color: "var(--text-dimmer)" }}>
              {subtitle}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!isLoading && visibleCount > 0 ? (
            <span className="text-[11px]" style={{ color: "var(--text-dimmer)" }}>
              {visibleCount === 1
                ? t("brainSuggestionsCountOne")
                : t("brainSuggestionsCount", { count: visibleCount })}
            </span>
          ) : null}
          <Link
            href="/agency-brain/learnings"
            className="text-[11px] font-medium transition-opacity hover:opacity-80"
            style={{ color: "#7c3aed" }}
          >
            {t("brainViewAll")}
          </Link>
        </div>
      </div>

      {isLoading ? (
        isFeed ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton-shimmer h-10 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="flex gap-2 overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="skeleton-shimmer h-[72px] min-w-[200px] flex-1 rounded-lg border"
                style={{ borderColor: "var(--border-color)" }}
              />
            ))}
          </div>
        )
      ) : visible.length === 0 ? (
        <div
          className="rounded-lg border px-3 py-2 text-[11px]"
          style={{
            borderColor: "var(--border-color)",
            background: "var(--surface-bg)",
            color: "var(--text-dim)"
          }}
        >
          {t("brainEmpty")}
        </div>
      ) : isFeed ? (
        <div
          className="max-h-full space-y-2 overflow-y-auto"
          style={{ scrollbarWidth: "thin", scrollbarColor: "var(--scrollbar-color) transparent" }}
        >
          {visible.map((s) => (
            <Link
              key={s.id}
              href={s.actionHref ?? "/agency-brain/learnings"}
              className="group flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-colors hover:opacity-95"
              style={{
                background: "rgba(245,166,35,0.08)",
                border: "1px solid rgba(245,166,35,0.22)"
              }}
            >
              <div
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                style={{ background: "rgba(245,166,35,0.16)" }}
              >
                <Sparkles size={12} style={{ color: "#f5a623" }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] leading-snug">
                  <span className="font-semibold" style={{ color: "var(--text-main)" }}>
                    {s.title}
                  </span>
                  <span className="mx-1.5 font-normal" style={{ color: "var(--text-dimmer)" }}>
                    ·
                  </span>
                  <span className="font-normal" style={{ color: "var(--text-dim)" }}>
                    {s.body}
                  </span>
                </p>
              </div>
              <span className="shrink-0 text-[10px] font-medium" style={{ color: "var(--text-dimmer)" }}>
                {t("brainConfidence", { value: s.confidence })}
              </span>
            </Link>
          ))}
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
