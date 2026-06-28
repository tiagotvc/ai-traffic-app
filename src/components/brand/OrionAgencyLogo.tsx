"use client";

import type { ComponentProps, CSSProperties } from "react";

import { useAppDarkMode } from "@/hooks/useAppDarkMode";
import { cn } from "@/lib/cn";

import whiteLogo from "../../../public/brand/white_logo.png";

const LOGO_SRC = whiteLogo.src;

type LogoSize = "sm" | "md" | "lg" | "xl";
/** `dark` = white logo (dark backgrounds). `light` = dark logo (light backgrounds). `auto` = follows data-theme. */
type LogoVariant = "dark" | "light" | "gold" | "auto";

/** Full wordmark height — PNG already includes "orion AGENCY" text. */
const WORDMARK_HEIGHT: Record<LogoSize, number> = {
  sm: 36,
  md: 44,
  lg: 52,
  xl: 60
};

/** Collapsed sidebar / icon-only slot (crops to the purple mark on the left). */
const ICON_SIZE: Record<LogoSize, number> = {
  sm: 36,
  md: 44,
  lg: 52,
  xl: 60
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

  const iconSize = ICON_SIZE[size];
  const isSidebarWordmark = Boolean(className?.includes("orion-logo--sidebar") && !className.includes("sidebar-collapsed"));
  const isSidebarIcon = Boolean(className?.includes("orion-logo--sidebar-collapsed"));
  const useSidebarCrop = isSidebarWordmark || isSidebarIcon;

  const imageStyle: CSSProperties = {
    filter: VARIANT_FILTER[resolvedVariant],
    ...(!useSidebarCrop && showText
      ? { height: WORDMARK_HEIGHT[size], width: "auto", maxWidth: "100%" }
      : {}),
    ...(!useSidebarCrop && !showText ? { height: iconSize, width: "auto", maxWidth: "none" } : {})
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
      style={!showText ? ({ "--orion-logo-icon-size": `${iconSize}px` } as CSSProperties) : undefined}
      aria-label="Orion Agency"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOGO_SRC}
        alt=""
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
