"use client";

import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/cn";

export function PremiumSvgDefs() {
  return (
    <defs>
      <linearGradient id="tpl-violet" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#c4b5fd" />
        <stop offset="100%" stopColor="#7c3aed" />
      </linearGradient>
      <linearGradient id="tpl-amber" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fde68a" />
        <stop offset="100%" stopColor="#f59e0b" />
      </linearGradient>
      <linearGradient id="tpl-emerald" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#6ee7b7" />
        <stop offset="100%" stopColor="#10b981" />
      </linearGradient>
      <linearGradient id="tpl-fuchsia" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#e879f9" />
        <stop offset="100%" stopColor="#a855f7" />
      </linearGradient>
      <linearGradient id="tpl-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#7dd3fc" />
        <stop offset="100%" stopColor="#0ea5e9" />
      </linearGradient>
      <radialGradient id="tpl-glow" cx="50%" cy="0%" r="75%">
        <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

export function PremiumPreviewFrame({
  children,
  className,
  accent = "violet",
  borderRadius = "10px",
  style
}: {
  children: ReactNode;
  className?: string;
  accent?: "violet" | "amber" | "emerald";
  borderRadius?: string;
  style?: CSSProperties;
}) {
  const border =
    accent === "amber"
      ? "rgba(245,166,35,0.42)"
      : accent === "emerald"
        ? "rgba(52,211,153,0.35)"
        : "rgba(245,166,35,0.32)";

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{
        borderRadius,
        background:
          "linear-gradient(155deg, rgba(124,58,237,0.18) 0%, rgba(10,15,20,0.95) 38%, rgba(15,20,28,0.98) 100%)",
        border: `1px solid ${border}`,
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 0 24px rgba(124,58,237,0.08), 0 8px 20px rgba(0,0,0,0.22)",
        ...style
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "10px 10px"
        }}
      />
      <div
        className="pointer-events-none absolute -right-5 -top-5 h-14 w-14 rounded-full blur-2xl"
        style={{ background: "rgba(124,58,237,0.22)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-6 -left-3 h-12 w-12 rounded-full blur-2xl"
        style={{ background: "rgba(245,166,35,0.12)" }}
      />
      {children}
    </div>
  );
}
