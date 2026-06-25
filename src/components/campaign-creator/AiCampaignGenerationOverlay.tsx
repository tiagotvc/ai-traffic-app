"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import type { AiCampaignGenerationStep } from "@/lib/ai-campaign-generation-progress";

type Props = {
  open: boolean;
  step: AiCampaignGenerationStep | null;
};

function CircuitBackground() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full opacity-30"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="circuit-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3].map((i) => (
        <path
          key={i}
          d={`M ${-20 + i * 80} 0 L ${200 + i * 120} 200 L ${400 + i * 60} 400 L ${800} ${300 + i * 100}`}
          fill="none"
          stroke="url(#circuit-grad)"
          strokeWidth="1.5"
          strokeDasharray="8 12"
          className="animate-[circuit-dash_4s_linear_infinite]"
          style={{ animationDelay: `${i * 0.7}s` }}
        />
      ))}
      {[0, 1, 2].map((i) => (
        <path
          key={`v-${i}`}
          d={`M ${100 + i * 250} 0 L ${150 + i * 200} 300 L ${80 + i * 280} 600 L ${300 + i * 150} 900`}
          fill="none"
          stroke="#7c3aed"
          strokeWidth="1"
          strokeOpacity="0.4"
          strokeDasharray="6 10"
          className="animate-[circuit-dash_5s_linear_infinite_reverse]"
          style={{ animationDelay: `${i * 1.1}s` }}
        />
      ))}
    </svg>
  );
}

export function AiCampaignGenerationOverlay({ open, step }: Props) {
  const t = useTranslations("campaignCreator.aiWizard.overlay");
  const [mounted, setMounted] = useState(false);
  const [displayStep, setDisplayStep] = useState<AiCampaignGenerationStep>("understandingAudience");
  const [messageVisible, setMessageVisible] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const next = step ?? "understandingAudience";
    if (next === displayStep) return;
    setMessageVisible(false);
    const timer = window.setTimeout(() => {
      setDisplayStep(next);
      setMessageVisible(true);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [displayStep, open, step]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="pointer-events-auto fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      role="alertdialog"
      aria-modal="true"
      aria-live="polite"
      aria-busy="true"
      aria-labelledby="ai-generation-overlay-title"
    >
      <div className="absolute inset-0 bg-black/70" aria-hidden />
      <div
        className="absolute inset-0 bg-[#05080c]/85 backdrop-blur-lg backdrop-saturate-50"
        aria-hidden
      />
      <CircuitBackground />
      <div className="ui-card pointer-events-none relative z-10 mx-4 w-full max-w-md px-8 py-10 text-center shadow-2xl">
        <div className="mx-auto mb-6 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl bg-[rgba(124,58,237,0.15)]">
          <Sparkles
            size={36}
            className="animate-pulse text-[var(--violet-bright)]"
            strokeWidth={1.6}
            aria-hidden
          />
        </div>
        <h2
          id="ai-generation-overlay-title"
          className="font-heading text-lg text-[var(--text-main)]"
        >
          {t("title")}
        </h2>
        <p
          className={`mt-3 min-h-[1.5rem] text-sm text-[var(--text-dim)] transition-opacity duration-200 ${
            messageVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          {t(displayStep)}
        </p>
        <p className="mt-2 text-xs text-[var(--text-dimmer)]">{t("subtitle")}</p>
      </div>
    </div>,
    document.body
  );
}
