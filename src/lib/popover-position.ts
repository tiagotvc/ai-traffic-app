import type { CSSProperties } from "react";

export const POPOVER_VIEWPORT_PADDING = 8;
export const POPOVER_GAP = 4;

export function resolvePopoverPlacement(
  trigger: HTMLElement,
  popoverHeight: number,
  preferred: "top" | "bottom" = "bottom"
): "top" | "bottom" {
  const rect = trigger.getBoundingClientRect();
  const spaceAbove = rect.top - POPOVER_VIEWPORT_PADDING;
  const spaceBelow = window.innerHeight - rect.bottom - POPOVER_VIEWPORT_PADDING;

  const preferredFits =
    preferred === "top" ? spaceAbove >= popoverHeight : spaceBelow >= popoverHeight;
  if (preferredFits) return preferred;

  const alternate = preferred === "top" ? "bottom" : "top";
  const alternateFits =
    alternate === "top" ? spaceAbove >= popoverHeight : spaceBelow >= popoverHeight;
  if (alternateFits) return alternate;

  return spaceBelow >= spaceAbove ? "bottom" : "top";
}

export function getPopoverFixedStyle(
  trigger: HTMLElement,
  placement: "top" | "bottom",
  options?: {
    gap?: number;
    width?: number | "trigger";
    zIndex?: number;
  }
): CSSProperties {
  const gap = options?.gap ?? POPOVER_GAP;
  const zIndex = options?.zIndex ?? 100;
  const rect = trigger.getBoundingClientRect();
  const width =
    options?.width === "trigger" || options?.width == null
      ? Math.min(rect.width, window.innerWidth - POPOVER_VIEWPORT_PADDING * 2)
      : options.width;

  let left = rect.left;
  if (left + width > window.innerWidth - POPOVER_VIEWPORT_PADDING) {
    left = window.innerWidth - POPOVER_VIEWPORT_PADDING - width;
  }
  left = Math.max(POPOVER_VIEWPORT_PADDING, left);

  if (placement === "top") {
    return {
      position: "fixed",
      left,
      width,
      bottom: window.innerHeight - rect.top + gap,
      zIndex
    };
  }

  return {
    position: "fixed",
    left,
    width,
    top: rect.bottom + gap,
    zIndex
  };
}
