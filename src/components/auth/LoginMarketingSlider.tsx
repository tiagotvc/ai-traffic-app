"use client";

import { Check, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { LoginProductShowcase } from "@/components/auth/LoginProductShowcase";
import { cn } from "@/lib/cn";
import type { ShowcaseCopy } from "@/lib/marketing/showcase-copy";

const SLIDE_COUNT = 5;
const AUTO_MS = 7000;

const TODAY_KEYS = ["today1", "today2", "today3", "today4", "today5", "today6"] as const;
const FUTURE_KEYS = ["future1", "future2", "future3", "future4"] as const;
const PHILOSOPHY_KEYS = ["philosophy1", "philosophy2", "philosophy3"] as const;
const SCALE_FROM = ["scaleFrom1", "scaleFrom2"] as const;
const SCALE_TO = ["scaleTo1", "scaleTo2", "scaleTo3"] as const;

export function LoginMarketingSlider({
  compact = false,
  showcaseCopy
}: {
  compact?: boolean;
  showcaseCopy: ShowcaseCopy;
}) {
  const t = useTranslations("auth");
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = useCallback((index: number) => {
    setActive((index + SLIDE_COUNT) % SLIDE_COUNT);
  }, []);

  const next = useCallback(() => go(active + 1), [active, go]);
  const prev = useCallback(() => go(active - 1), [active, go]);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(next, AUTO_MS);
    return () => window.clearInterval(id);
  }, [next, paused]);

  const titleClass = compact
    ? "font-heading text-[1.55rem] font-bold leading-tight tracking-tight"
    : "font-heading text-[1.75rem] font-bold leading-tight tracking-tight xl:text-[2rem] xl:leading-[1.12]";

  const subtitleClass = compact
    ? "mt-2 text-[13px] leading-relaxed text-violet-100/85"
    : "mt-2.5 text-sm leading-relaxed text-violet-100/90";

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        className={cn(
          "relative min-h-0 flex-1 overflow-hidden px-0.5",
          compact ? "min-h-[320px]" : "min-h-[280px] lg:min-h-0"
        )}
      >
        {/* 1 — Upgrade, não substituição */}
        <SlidePanel active={active} index={0}>
          <SlideBadge label={t("slide1Badge")} accent="amber" />
          <h2 className={cn(titleClass, "mt-3")}>{t("slide1Title")}</h2>
          <p className={subtitleClass}>{t("slide1Subtitle")}</p>

          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-300/70">
              {t("slide1ScaleLabel")}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {SCALE_FROM.map((key) => (
                <span
                  key={key}
                  className="rounded-lg bg-white/5 px-2.5 py-1 text-xs text-violet-200/65"
                >
                  {t(key)}
                </span>
              ))}
              <span className="text-violet-300/50">→</span>
              <div className="flex flex-wrap gap-1.5">
                {SCALE_TO.map((key) => (
                  <span
                    key={key}
                    className="rounded-lg px-2.5 py-1 text-xs font-semibold text-white"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(245,166,35,0.3), rgba(124,58,237,0.35))",
                      border: "1px solid rgba(245,166,35,0.35)"
                    }}
                  >
                    {t(key)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <p className="mt-4 text-sm font-medium leading-relaxed text-amber-200/90">
            {t("slide1Closing")}
          </p>
        </SlidePanel>

        {/* 2 — Visão + IA com você no controle */}
        <SlidePanel active={active} index={1}>
          <SlideBadge label={t("slide2Badge")} accent="violet" />
          <h2 className={cn(titleClass, "mt-3")}>{t("slide2Title")}</h2>
          <p className={subtitleClass}>{t("slide2Subtitle")}</p>
          <FeatureGrid compact={compact}>
            {PHILOSOPHY_KEYS.map((key) => (
              <FeatureCard key={key} icon="sparkle" compact={compact}>
                {t(key)}
              </FeatureCard>
            ))}
          </FeatureGrid>
          <p className="mt-4 rounded-xl border border-violet-400/20 bg-violet-500/10 px-3 py-2 text-[13px] font-medium leading-relaxed text-violet-100/90">
            {t("slide2PriceHint")}
          </p>
        </SlidePanel>

        {/* 3 — O que temos hoje */}
        <SlidePanel active={active} index={2}>
          <SlideBadge label={t("slide3Badge")} accent="emerald" />
          <h2 className={cn(titleClass, "mt-3")}>{t("slide3Title")}</h2>
          <p className={subtitleClass}>{t("slide3Subtitle")}</p>
          <FeatureGrid compact={compact} columns={compact ? 1 : 2}>
            {TODAY_KEYS.map((key) => (
              <FeatureCard key={key} icon="check" compact={compact}>
                {t(key)}
              </FeatureCard>
            ))}
          </FeatureGrid>
        </SlidePanel>

        {/* 4 — Roadmap */}
        <SlidePanel active={active} index={3}>
          <SlideBadge label={t("slide4Badge")} accent="amber" soon soonLabel={t("slide4Roadmap")} />
          <h2 className={cn(titleClass, "mt-3")}>{t("slide4Title")}</h2>
          <p className={subtitleClass}>{t("slide4Subtitle")}</p>
          <FeatureGrid compact={compact} columns={compact ? 1 : 2}>
            {FUTURE_KEYS.map((key) => (
              <FeatureCard key={key} icon="sparkle" compact={compact}>
                {t(key)}
              </FeatureCard>
            ))}
          </FeatureGrid>
          <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-[13px] font-medium leading-relaxed text-amber-100/90">
            {t("slide4Closing")}
          </p>
        </SlidePanel>

        {/* 5 — Preview */}
        <SlidePanel active={active} index={4} center>
          <SlideBadge label={t("slide5Badge")} accent="violet" />
          <h2 className={cn(titleClass, "mt-3 text-center")}>{t("slide5Title")}</h2>
          <p className={cn(subtitleClass, "text-center")}>{t("slide5Subtitle")}</p>
          <div className="mt-3 w-full max-w-[320px]">
            <LoginProductShowcase copy={showcaseCopy} compact animate={active === 4} />
          </div>
          <div className="mt-3 grid w-full max-w-[320px] grid-cols-2 gap-2">
            <StatPill value={t("statValue")} label={t("statLabel")} accent="text-amber-300" />
            <StatPill value={t("stat2Value")} label={t("stat2Label")} accent="text-white" />
          </div>
          <p className="mt-3 max-w-[320px] text-center text-[11px] leading-relaxed text-violet-200/70">
            {t("trustLine")}
          </p>
        </SlidePanel>
      </div>

      <div className="mt-4 flex shrink-0 items-center justify-between gap-3 px-0.5">
        <NavButton onClick={prev} label={t("slidePrev")}>
          <ChevronLeft className="h-4 w-4" />
        </NavButton>

        <div className="flex items-center gap-1.5">
          {Array.from({ length: SLIDE_COUNT }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === active ? "w-5 bg-amber-400" : "w-1.5 bg-white/25 hover:bg-white/40"
              )}
              aria-label={t("slideGoTo", { n: i + 1 })}
              aria-current={i === active ? "true" : undefined}
            />
          ))}
        </div>

        <NavButton onClick={next} label={t("slideNext")}>
          <ChevronRight className="h-4 w-4" />
        </NavButton>
      </div>
    </div>
  );
}

function FeatureGrid({
  children,
  compact,
  columns = 2
}: {
  children: ReactNode;
  compact?: boolean;
  columns?: 1 | 2;
}) {
  return (
    <div
      className={cn(
        "mt-3.5 grid gap-2",
        columns === 2 && !compact ? "grid-cols-2" : "grid-cols-1"
      )}
    >
      {children}
    </div>
  );
}

function FeatureCard({
  icon,
  compact,
  children
}: {
  icon: "check" | "sparkle";
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.06] p-2.5">
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg ring-1",
          icon === "check"
            ? "h-7 w-7 bg-emerald-500/20 text-emerald-300 ring-emerald-400/25"
            : "h-7 w-7 bg-amber-500/15 text-amber-300 ring-amber-400/25"
        )}
      >
        {icon === "check" ? (
          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 leading-snug text-violet-50/95",
          compact ? "text-[12px]" : "text-[13px]"
        )}
      >
        {children}
      </span>
    </div>
  );
}

function StatPill({
  value,
  label,
  accent
}: {
  value: string;
  label: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-2 text-center">
      <div className={cn("font-heading text-base font-bold", accent)}>{value}</div>
      <div className="mt-0.5 text-[9px] leading-snug text-violet-200/75">{label}</div>
    </div>
  );
}

function SlideBadge({
  label,
  accent,
  soon = false,
  soonLabel
}: {
  label: string;
  accent: "amber" | "violet" | "emerald";
  soon?: boolean;
  soonLabel?: string;
}) {
  const dotColor =
    accent === "amber" ? "bg-amber-400" : accent === "emerald" ? "bg-emerald-400" : "bg-violet-300";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-violet-100 ring-1 ring-white/15">
        <span className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />
        {label}
      </p>
      {soon && soonLabel ? (
        <span className="rounded-full border border-amber-400/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
          {soonLabel}
        </span>
      ) : null}
    </div>
  );
}

function NavButton({
  onClick,
  label,
  children
}: {
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-violet-100 transition hover:bg-white/10"
      aria-label={label}
    >
      {children}
    </button>
  );
}

function SlidePanel({
  active,
  index,
  center = false,
  children
}: {
  active: number;
  index: number;
  center?: boolean;
  children: ReactNode;
}) {
  const isActive = active === index;

  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col transition-opacity duration-500 ease-out",
        center ? "items-center justify-center" : "justify-center",
        isActive ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0"
      )}
      aria-hidden={!isActive}
    >
      <div className={cn("w-full", center && "flex flex-col items-center")}>{children}</div>
    </div>
  );
}
