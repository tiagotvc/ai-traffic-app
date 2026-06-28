import { rgb, type RGB } from "pdf-lib";

export type CampaignExportBranding = {
  brandName?: string;
  agencyName?: string;
  logoUrl?: string;
  accentColor?: string;
  reportTitle?: string;
  includeLogo?: boolean;
  footerContact?: string;
};

export const DEFAULT_EXPORT_ACCENT = "#7c3aed";

export function resolveExportAccentColor(input?: string): string {
  const raw = input?.trim();
  if (!raw) return DEFAULT_EXPORT_ACCENT;
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw;
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    const h = raw.slice(1);
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  }
  return DEFAULT_EXPORT_ACCENT;
}

export function hexToPdfRgb(hex: string): RGB {
  const normalized = resolveExportAccentColor(hex).replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
  return rgb(r, g, b);
}

export function hexToArgb(hex: string): string {
  const normalized = resolveExportAccentColor(hex).replace("#", "");
  return `FF${normalized.toUpperCase()}`;
}

export function accentSoftPdfRgb(hex: string): RGB {
  const base = hexToPdfRgb(hex);
  const clamp = (n: number) => Math.min(1, Math.max(0, n));
  return rgb(
    clamp(base.red * 0.08 + 0.92),
    clamp(base.green * 0.08 + 0.91),
    clamp(base.blue * 0.08 + 0.996)
  );
}

export async function fetchLogoBytes(
  logoUrl: string
): Promise<{ bytes: Uint8Array; kind: "png" | "jpg" } | null> {
  try {
    const res = await fetch(logoUrl);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    const buffer = await res.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    if (contentType.includes("png") || logoUrl.toLowerCase().includes(".png")) {
      return { bytes, kind: "png" };
    }
    if (
      contentType.includes("jpeg") ||
      contentType.includes("jpg") ||
      logoUrl.toLowerCase().match(/\.jpe?g/)
    ) {
      return { bytes, kind: "jpg" };
    }
    return { bytes, kind: "png" };
  } catch {
    return null;
  }
}

export function hasWhiteLabelBranding(branding: CampaignExportBranding): boolean {
  return Boolean(branding.logoUrl || branding.brandName || branding.agencyName);
}
