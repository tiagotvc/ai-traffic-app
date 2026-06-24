import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

type LogoSize = "sm" | "md" | "lg" | "xl";
type LogoVariant = "dark" | "light" | "gold";

const WIDTH: Record<LogoSize, number> = {
  sm: 128,
  md: 156,
  lg: 188,
  xl: 228
};

const ACCENT = "#f5a623";

function OrionWordmarkSvg({
  variant,
  width
}: {
  variant: LogoVariant;
  width: number;
}) {
  const ink = variant === "dark" ? "#ffffff" : "#0f172a";
  const sub = variant === "dark" ? "rgba(255,255,255,0.65)" : "#64748b";
  const accent = variant === "dark" ? ACCENT : "#d4880a";

  return (
    <svg
      width={width}
      height={width * 0.34}
      viewBox="0 0 240 82"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <g transform="translate(4 5)">
        <circle
          cx="16"
          cy="26"
          r="13"
          stroke={ink}
          strokeWidth="3.2"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="68 12"
          transform="rotate(-32 16 26)"
        />
        <path
          d="M16 15 L17.6 20 L23 20 L18.8 23.2 L20.4 28.5 L16 25.5 L11.6 28.5 L13.2 23.2 L9 20 L14.4 20 Z"
          fill={accent}
        />
      </g>
      <text
        x="40"
        y="48"
        fill={ink}
        fontFamily="var(--font-heading), ui-sans-serif, system-ui, sans-serif"
        fontSize="36"
        fontWeight="700"
        letterSpacing="5"
      >
        RION
      </text>
      <line x1="46" y1="62" x2="90" y2="62" stroke={accent} strokeWidth="0.8" opacity="0.85" />
      <text
        x="120"
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
      <line x1="138" y1="62" x2="182" y2="62" stroke={accent} strokeWidth="0.8" opacity="0.85" />
    </svg>
  );
}

export function OrionAgencyLogo({
  size = "md",
  showText = true,
  variant = "dark",
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
  const width = WIDTH[size];

  if (!showText) {
    return (
      <div className={cn("flex shrink-0 items-center justify-center", className)} aria-label="Orion Agency">
        <svg width={36} height={36} viewBox="0 0 36 36" fill="none" aria-hidden>
          <circle
            cx="18"
            cy="18"
            r="11"
            stroke={variant === "dark" ? "#fff" : "#0a0a0a"}
            strokeWidth="2.2"
            fill="none"
            strokeDasharray="58 10"
            transform="rotate(-30 18 18)"
          />
          <path
            d="M18 10 L19.5 14.5 L24 14.5 L20.5 17.5 L22 22 L18 19 L14 22 L15.5 17.5 L12 14.5 L16.5 14.5 Z"
            fill={variant === "dark" ? ACCENT : "#d4880a"}
          />
        </svg>
      </div>
    );
  }

  return (
    <div className={cn("inline-flex shrink-0", className)} aria-label="Orion Agency">
      <OrionWordmarkSvg variant={variant} width={width} />
    </div>
  );
}

/** @deprecated Use OrionAgencyLogo — kept for existing imports during rebrand. */
export function TrafficAILogo(props: ComponentProps<typeof OrionAgencyLogo>) {
  return <OrionAgencyLogo {...props} />;
}
