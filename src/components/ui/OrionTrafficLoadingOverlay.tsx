"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { OrionAgencyLogo } from "@/components/brand/OrionAgencyLogo";
import { cn } from "@/lib/cn";

type Props = {
  open: boolean;
  title: string;
  message?: string;
  subtitle?: string;
  /** Fade message when step changes */
  messageKey?: string;
  ariaLabelledBy?: string;
  className?: string;
};

const TRAFFIC_LANES = [
  { delay: "0s", duration: "2.1s" },
  { delay: "0.35s", duration: "2.5s" },
  { delay: "0.7s", duration: "1.9s" }
] as const;

const TRAFFIC_BARS = [0, 0.12, 0.24, 0.36, 0.48, 0.6, 0.72] as const;

/** Overlay fullscreen com blur, logo Orion e animação de tráfego (fluxo de dados / impressões). */
export function OrionTrafficLoadingOverlay({
  open,
  title,
  message,
  subtitle,
  messageKey,
  ariaLabelledBy = "orion-traffic-loading-title",
  className
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
      className={cn(
        "orion-traffic-loading pointer-events-auto fixed inset-0 z-[9999] flex items-center justify-center",
        className
      )}
      role="alertdialog"
      aria-modal="true"
      aria-live="polite"
      aria-busy="true"
      aria-labelledby={ariaLabelledBy}
    >
      <div className="orion-action-loading__backdrop absolute inset-0" aria-hidden />
      <div className="orion-action-loading__glow absolute inset-0" aria-hidden />
      <div className="orion-traffic-loading__grid absolute inset-0 opacity-[0.35]" aria-hidden />

      <div className="relative z-10 mx-4 flex w-full max-w-md flex-col items-center px-2 py-8 text-center">
        <div className="orion-traffic-loading__scene relative mb-6 flex w-full max-w-[17.5rem] items-center justify-center">
          <div className="orion-traffic-loading__lanes absolute inset-x-0 top-1/2 -translate-y-1/2" aria-hidden>
            {TRAFFIC_LANES.map((lane, i) => (
              <div key={i} className="orion-traffic-loading__lane">
                <span
                  className="orion-traffic-loading__pulse orion-traffic-loading__pulse--a"
                  style={{ animationDelay: lane.delay, animationDuration: lane.duration }}
                />
                <span
                  className="orion-traffic-loading__pulse orion-traffic-loading__pulse--b"
                  style={{
                    animationDelay: `calc(${lane.delay} + 0.55s)`,
                    animationDuration: lane.duration
                  }}
                />
              </div>
            ))}
          </div>

          <div className="orion-action-loading__logo-wrap relative flex min-h-[5.5rem] w-full items-center justify-center">
            <span className="orion-action-loading__ring" aria-hidden />
            <span className="orion-action-loading__ring orion-action-loading__ring--delayed" aria-hidden />
            <div className="orion-action-loading__logo relative z-10 flex items-center justify-center rounded-2xl bg-[var(--surface-thead)] px-5 py-4 shadow-lg shadow-black/20">
              <OrionAgencyLogo size="xl" variant="dark" />
            </div>
          </div>
        </div>

        <h2 id={ariaLabelledBy} className="font-heading text-lg font-semibold text-[var(--text-main)]">
          {title}
        </h2>

        {displayMessage ? (
          <p
            className={cn(
              "mt-3 min-h-[1.5rem] max-w-sm text-sm leading-relaxed text-[var(--text-dim)] transition-opacity duration-200",
              messageVisible ? "opacity-100" : "opacity-0"
            )}
          >
            {displayMessage}
          </p>
        ) : null}

        {subtitle ? <p className="mt-2 text-xs text-[var(--text-dimmer)]">{subtitle}</p> : null}

        <div className="orion-traffic-loading__bars mt-6 flex items-end justify-center gap-1" aria-hidden>
          {TRAFFIC_BARS.map((delay) => (
            <span
              key={delay}
              className="orion-traffic-loading__bar"
              style={{ animationDelay: `${delay}s` }}
            />
          ))}
        </div>

        <div className="orion-action-loading__shimmer-track orion-traffic-loading__track mx-auto mt-5 h-1 w-44 overflow-hidden rounded-full">
          <div className="orion-action-loading__shimmer-bar h-full w-1/2 rounded-full" />
        </div>
      </div>
    </div>,
    document.body
  );
}
