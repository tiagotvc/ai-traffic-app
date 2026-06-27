import "server-only";

import { isPlatformFeatureEnabled } from "@/lib/feature-flags/service";

/**
 * Janelas/modelos de atribuição da Meta (P2). Converte um **preset** legível no
 * array `action_attribution_windows` da Graph API. `default` = null → mantém o
 * comportamento atual da Meta (7d_click + 1d_view), sem alterar nada.
 */
export const ATTRIBUTION_PRESETS = {
  default: null,
  "1d_view": ["1d_view"],
  "1d_click": ["1d_click"],
  "7d_click": ["7d_click"],
  "7d_click_1d_view": ["7d_click", "1d_view"],
  "28d_click_1d_view": ["28d_click", "1d_view"]
} as const;

export type AttributionPreset = keyof typeof ATTRIBUTION_PRESETS;

export function isValidAttributionPreset(v: string): v is AttributionPreset {
  return Object.prototype.hasOwnProperty.call(ATTRIBUTION_PRESETS, v);
}

/** Preset → `action_attribution_windows` (ou null = default da Meta). */
export function resolveAttributionWindows(preset: string | null | undefined): string[] | null {
  if (!preset || !isValidAttributionPreset(preset)) return null;
  const value = ATTRIBUTION_PRESETS[preset];
  return value ? [...value] : null;
}

export async function isAttributionEnabled(): Promise<boolean> {
  return isPlatformFeatureEnabled("meta.attribution");
}
