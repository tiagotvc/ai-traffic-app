"use client";

import type { ComponentProps } from "react";

import { useAppDarkMode } from "@/hooks/useAppDarkMode";
import { cn } from "@/lib/cn";

type LogoSize = "sm" | "md" | "lg" | "xl";
/** `dark` = texto claro (fundo escuro). `light` = texto escuro (fundo claro). `auto` = segue data-theme. */
type LogoVariant = "dark" | "light" | "gold" | "auto";

const WIDTH: Record<LogoSize, number> = {
  sm: 78,
  md: 95,
  lg: 114,
  xl: 138
};

const ACCENT = "#f5a623";

function OrionWordmarkSvg({
  variant,
  width
}: {
  variant: Exclude<LogoVariant, "auto">;
  width: number;
}) {
  const ink = variant === "dark" ? "#ffffff" : "#0f172a";
  const sub = variant === "dark" ? "rgba(255,255,255,0.65)" : "#64748b";
  const accent = variant === "dark" ? ACCENT : "#d4880a";

  return (
    <svg
      width={width}
      height={width * 0.56}
      viewBox="0 0 150 84"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* "O" como ícone-letra (maior), seguido de RION para formar a palavra ORION */}
      <circle
        cx="20"
        cy="30"
        r="16"
        stroke={ink}
        strokeWidth="3.4"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="84 14"
        transform="rotate(-32 20 30)"
      />
      <path
        d="M20 22.5 L21.76 27.57 L27.13 27.68 L22.85 30.93 L24.41 36.07 L20 33 L15.59 36.07 L17.15 30.93 L12.87 27.68 L18.24 27.57 Z"
        fill={accent}
      />
      <text
        x="44"
        y="44"
        fill={ink}
        fontFamily="var(--font-heading), ui-sans-serif, system-ui, sans-serif"
        fontSize="36"
        fontWeight="700"
        letterSpacing="5"
      >
        RION
      </text>
      {/* Linha sob toda a palavra Orion (alinhada à esquerda, sob o "O") */}
      <line x1="8" y1="56" x2="143" y2="56" stroke={accent} strokeWidth="1" opacity="0.85" />
      {/* AGENCY centralizado exatamente sob Orion */}
      <text
        x="75"
        y="72"
        fill={sub}
        textAnchor="middle"
        fontFamily="var(--font-heading), ui-sans-serif, system-ui, sans-serif"
        fontSize="11.5"
        fontWeight="500"
        letterSpacing="5"
      >
        AGENCY
      </text>
    </svg>
  );
}

export function OrionAgencyLogo({
  size = "md",
  showText = true,
  variant = "auto",
  className,
  productLabel: _productLabel
}: {
  size?: LogoSize;
  showText?: boolean;
  variant?: LogoVariant;
  className?: string;
  /** @deprecated Orion wordmark includes Agency — ignored */
  productLabel?: string;
}) {
  const isDarkTheme = useAppDarkMode();
  const resolvedVariant: Exclude<LogoVariant, "auto"> =
    variant === "auto" ? (isDarkTheme ? "dark" : "light") : variant;
  const width = WIDTH[size];

  if (!showText) {
    return (
      <div className={cn("flex shrink-0 items-center justify-center", className)} aria-label="Orion Agency">
        <svg width={36} height={36} viewBox="0 0 36 36" fill="none" aria-hidden>
          <circle
            cx="18"
            cy="18"
            r="13"
            stroke={resolvedVariant === "dark" ? "#fff" : "#0a0a0a"}
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
            strokeDasharray="68 12"
            transform="rotate(-30 18 18)"
          />
          <path
            d="M18 9.5 L19.76 14.57 L25.13 14.68 L20.85 17.93 L22.41 23.07 L18 20 L13.59 23.07 L15.15 17.93 L10.87 14.68 L16.24 14.57 Z"
            fill={resolvedVariant === "dark" ? ACCENT : "#d4880a"}
          />
        </svg>
      </div>
    );
  }

  return (
    <div className={cn("inline-flex shrink-0", className)} aria-label="Orion Agency">
      <OrionWordmarkSvg variant={resolvedVariant} width={width} />
    </div>
  );
}

/** @deprecated Use OrionAgencyLogo — kept for existing imports during rebrand. */
export function TrafficAILogo(props: ComponentProps<typeof OrionAgencyLogo>) {
  return <OrionAgencyLogo {...props} />;
}
