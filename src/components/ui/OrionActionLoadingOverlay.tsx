"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { OrionAgencyLogo } from "@/components/brand/OrionAgencyLogo";

type Props = {
  open: boolean;
  title: string;
  message?: string;
  subtitle?: string;
  /** Fade message when step changes */
  messageKey?: string;
  ariaLabelledBy?: string;
};

export function OrionActionLoadingOverlay({
  open,
  title,
  message,
  subtitle,
  messageKey,
  ariaLabelledBy = "orion-action-loading-title"
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [messageVisible, setMessageVisible] = useState(true);
  const [displayMessage, setDisplayMessage] = useState(message ?? "");

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
    const next = message ?? "";
    if (next === displayMessage) return;
    setMessageVisible(false);
    const timer = window.setTimeout(() => {
      setDisplayMessage(next);
      setMessageVisible(true);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [displayMessage, message, messageKey]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="orion-action-loading pointer-events-auto fixed inset-0 z-[9999] flex items-center justify-center"
      role="alertdialog"
      aria-modal="true"
      aria-live="polite"
      aria-busy="true"
      aria-labelledby={ariaLabelledBy}
    >
      <div className="orion-action-loading__backdrop absolute inset-0" aria-hidden />
      <div className="orion-action-loading__glow absolute inset-0" aria-hidden />

      <div className="orion-action-loading__panel ui-card relative z-10 mx-4 w-full max-w-md px-8 py-10 text-center shadow-2xl">
        <div className="orion-action-loading__logo-wrap mx-auto mb-6 flex min-h-[5.5rem] items-center justify-center px-2">
          <span className="orion-action-loading__ring" aria-hidden />
          <span className="orion-action-loading__ring orion-action-loading__ring--delayed" aria-hidden />
          <div className="orion-action-loading__logo relative z-10 flex items-center justify-center rounded-2xl bg-[var(--surface-thead)] px-5 py-4">
            <OrionAgencyLogo size="md" variant="dark" />
          </div>
        </div>

        <h2 id={ariaLabelledBy} className="font-heading text-lg text-[var(--text-main)]">
          {title}
        </h2>

        {displayMessage ? (
          <p
            className={`mt-3 min-h-[1.5rem] text-sm text-[var(--text-dim)] transition-opacity duration-200 ${
              messageVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            {displayMessage}
          </p>
        ) : null}

        {subtitle ? (
          <p className="mt-2 text-xs text-[var(--text-dimmer)]">{subtitle}</p>
        ) : null}

        <div className="orion-action-loading__shimmer-track mx-auto mt-6 h-1 w-40 overflow-hidden rounded-full">
          <div className="orion-action-loading__shimmer-bar h-full w-1/2 rounded-full" />
        </div>
      </div>
    </div>,
    document.body
  );
}
