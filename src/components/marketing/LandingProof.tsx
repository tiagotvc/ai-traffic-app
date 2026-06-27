"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { MarketingReveal } from "@/components/marketing/motion/MarketingReveal";
import { MarketingStagger, MarketingStaggerItem } from "@/components/marketing/motion/MarketingStagger";
import { useReducedMotion } from "@/components/marketing/motion/useReducedMotion";

const STATS = ["missionStat1", "missionStat2", "missionStat3", "missionStat4"] as const;

function parseStatValue(raw: string): { prefix: string; number: number | null; suffix: string } {
  const match = raw.match(/^([^0-9−-]*)([0-9]+)(.*)$/);
  if (!match) return { prefix: "", number: null, suffix: raw };
  return { prefix: match[1], number: Number(match[2]), suffix: match[3] };
}

function CountUpStat({ valueKey }: { valueKey: (typeof STATS)[number] }) {
  const t = useTranslations("marketing");
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [display, setDisplay] = useState(0);

  const raw = t(`${valueKey}Value`);
  const parsed = parseStatValue(raw);

  useEffect(() => {
    if (reduced || parsed.number == null) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setVisible(true);
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [parsed.number, reduced]);

  useEffect(() => {
    if (!visible || parsed.number == null || reduced) return;
    const target = parsed.number;
    const duration = 1200;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setDisplay(Math.round(target * p));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [visible, parsed.number, reduced]);

  const shown =
    parsed.number != null && visible && !reduced
      ? `${parsed.prefix}${display}${parsed.suffix}`
      : raw;

  return (
    <div ref={ref} className="marketing-card p-4 text-center">
      <div className="font-heading text-2xl font-bold text-[var(--amber-bright)]">{shown}</div>
      <div className="mt-1 text-[11px] leading-snug text-[var(--text-dim)]">{t(`${valueKey}Label`)}</div>
    </div>
  );
}

export function LandingProof() {
  const t = useTranslations("marketing");

  return (
    <section className="marketing-section">
      <div className="mx-auto max-w-6xl">
        <MarketingReveal className="text-center">
          <p className="marketing-section-title">{t("proofBadge")}</p>
          <h2 className="marketing-section-heading">{t("proofTitle")}</h2>
          <p className="marketing-section-sub mx-auto max-w-2xl">{t("proofSubtitle")}</p>
        </MarketingReveal>

        <MarketingStagger className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {STATS.map((key) => (
            <MarketingStaggerItem key={key}>
              <CountUpStat valueKey={key} />
            </MarketingStaggerItem>
          ))}
        </MarketingStagger>

        <MarketingReveal className="mt-6 text-center" delay={0.1}>
          <p className="text-xs text-[var(--text-dimmer)]">{t("proofDisclaimer")}</p>
        </MarketingReveal>
      </div>
    </section>
  );
}
