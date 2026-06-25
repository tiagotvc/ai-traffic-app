"use client";

import { Cog } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import type { CampaignPublishProgressStep } from "@/lib/campaign-publish-progress";

type Props = {
  open: boolean;
  step: CampaignPublishProgressStep | null;
};

export function CampaignPublishOverlay({ open, step }: Props) {
  const t = useTranslations("campaignCreator.publishOverlay");
  const [mounted, setMounted] = useState(false);
  const [displayStep, setDisplayStep] = useState<CampaignPublishProgressStep>("preparing");
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
    const next = step ?? "preparing";
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
      className="pointer-events-auto fixed inset-0 z-[9999] flex items-center justify-center"
      role="alertdialog"
      aria-modal="true"
      aria-live="polite"
      aria-busy="true"
      aria-labelledby="campaign-publish-overlay-title"
    >
      <div className="absolute inset-0 bg-black/70" aria-hidden />
      <div
        className="absolute inset-0 bg-[#05080c]/85 backdrop-blur-lg backdrop-saturate-50"
        aria-hidden
      />
      <div className="ui-card pointer-events-none relative z-10 mx-4 w-full max-w-md px-8 py-10 text-center shadow-2xl">
        <div className="mx-auto mb-6 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl bg-[var(--surface-thead)]">
          <Cog
            size={38}
            className="animate-spin text-[var(--amber-bright)]"
            strokeWidth={1.6}
            aria-hidden
          />
        </div>
        <h2
          id="campaign-publish-overlay-title"
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
