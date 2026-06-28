"use client";

import type { ComponentProps, CSSProperties } from "react";

import { useAppDarkMode } from "@/hooks/useAppDarkMode";
import { cn } from "@/lib/cn";

const LOGO_SRC = "/white_logo.png";

type LogoSize = "sm" | "md" | "lg" | "xl";
/** `dark` = white logo (dark backgrounds). `light` = dark logo (light backgrounds). `auto` = follows data-theme. */
type LogoVariant = "dark" | "light" | "gold" | "auto";

const FULL_WIDTH: Record<LogoSize, number> = {
  sm: 140,
  md: 120,
  lg: 168,
  xl: 200
};

const COMPACT_HEIGHT: Record<LogoSize, number> = {
  sm: 28,
  md: 34,
  lg: 42,
  xl: 52
};

const VARIANT_FILTER: Record<Exclude<LogoVariant, "auto">, string | undefined> = {
  dark: undefined,
  light: "brightness(0) saturate(100%)",
  gold: "brightness(0) saturate(100%) sepia(1) saturate(4) hue-rotate(5deg)"
};

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

  const imageStyle: CSSProperties = {
    filter: VARIANT_FILTER[resolvedVariant],
    ...(showText
      ? { width: FULL_WIDTH[size], height: "auto" }
      : { height: COMPACT_HEIGHT[size], width: "auto" })
  };

  return (
    <div
      className={cn(
        "orion-logo",
        `orion-logo--${size}`,
        `orion-logo--${resolvedVariant}`,
        !showText && "orion-logo--icon-only",
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOGO_SRC}
        alt="Orion Agency"
        className="orion-logo__image"
        style={imageStyle}
        decoding="async"
      />
    </div>
  );
}

/** @deprecated Use OrionAgencyLogo — kept for existing imports during rebrand. */
export function TrafficAILogo(props: ComponentProps<typeof OrionAgencyLogo>) {
  return <OrionAgencyLogo {...props} />;
}
