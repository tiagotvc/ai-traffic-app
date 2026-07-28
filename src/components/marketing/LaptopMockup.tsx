"use client";

import { useReducedMotion } from "@/components/marketing/motion/useReducedMotion";

/** Product screenshot framed inside a laptop. Pure CSS — no external mockup asset. */
export function LaptopMockup({
  src,
  alt,
  caption,
  liveLabel
}: {
  src: string;
  alt: string;
  caption?: string;
  liveLabel?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <div className="mx-auto w-full max-w-xl">
      {/* Lid / screen */}
      <div className="relative rounded-t-2xl border border-b-0 border-[var(--border-color)] bg-[#0b0e13] p-2.5 shadow-2xl shadow-black/40 ring-1 ring-[var(--ui-accent-border)] sm:p-3">
        {/* webcam */}
        <div className="mx-auto mb-2 h-1 w-1 rounded-full bg-white/20" />

        <div className="overflow-hidden rounded-lg border border-white/10 bg-[var(--surface-card)]">
          {/* in-app top bar */}
          {caption || liveLabel ? (
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border-color)] px-3 py-2">
              {caption ? (
                <span className="truncate font-mono text-[0.6rem] uppercase tracking-[0.14em] text-[var(--text-dim)]">
                  {caption}
                </span>
              ) : (
                <span />
              )}
              {liveLabel ? (
                <span className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[0.58rem] font-bold uppercase tracking-[0.14em] text-emerald-300">
                  <span className="relative flex h-1.5 w-1.5">
                    {!reduced ? (
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                    ) : null}
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </span>
                  {liveLabel}
                </span>
              ) : null}
            </div>
          ) : null}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="block w-full" loading="eager" decoding="async" />
        </div>
      </div>

      {/* Base / hinge — wider than the lid, grounded with a contact shadow */}
      <div className="relative mx-auto -ml-[8%] w-[116%]">
        <div className="h-3.5 rounded-b-2xl border-t border-white/10 bg-gradient-to-b from-[#20242e] to-[#12151b] shadow-[0_20px_34px_-14px_rgba(0,0,0,0.75)]" />
        {/* opening notch */}
        <div className="absolute left-1/2 top-0 h-1.5 w-28 -translate-x-1/2 rounded-b-lg bg-black/50" />
      </div>
    </div>
  );
}
