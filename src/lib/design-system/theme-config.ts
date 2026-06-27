export type ThemeMode = "light" | "dark";

export type ThemePalette = {
  surfaceBg: string;
  surfaceCard: string;
  textMain: string;
  textDim: string;
  textDimmer: string;
  borderColor: string;
  uiAccent: string;
  uiAccentMuted: string;
  uiAccentBorder: string;
  uiAccentBtnFrom: string;
  uiAccentBtnTo: string;
  uiAccentBtnText: string;
  brandPrimary: string;
  brandSecondary: string;
};

export type DesignSystemThemeConfig = {
  light: ThemePalette;
  dark: ThemePalette;
  updatedAt?: string;
};

export type ThemeTokenKey = keyof ThemePalette;

export type ThemeTokenGroup = "surfaces" | "accent" | "brand";

export type ThemeTokenDef = {
  key: ThemeTokenKey;
  cssVar: string;
  group: ThemeTokenGroup;
  colorPicker: boolean;
};

export const THEME_TOKEN_DEFS: ThemeTokenDef[] = [
  { key: "surfaceBg", cssVar: "--surface-bg", group: "surfaces", colorPicker: true },
  { key: "surfaceCard", cssVar: "--surface-card", group: "surfaces", colorPicker: true },
  { key: "textMain", cssVar: "--text-main", group: "surfaces", colorPicker: true },
  { key: "textDim", cssVar: "--text-dim", group: "surfaces", colorPicker: true },
  { key: "textDimmer", cssVar: "--text-dimmer", group: "surfaces", colorPicker: true },
  { key: "borderColor", cssVar: "--border-color", group: "surfaces", colorPicker: false },
  { key: "uiAccent", cssVar: "--ui-accent", group: "accent", colorPicker: true },
  { key: "uiAccentMuted", cssVar: "--ui-accent-muted", group: "accent", colorPicker: false },
  { key: "uiAccentBorder", cssVar: "--ui-accent-border", group: "accent", colorPicker: false },
  { key: "uiAccentBtnFrom", cssVar: "--ui-accent-btn-from", group: "accent", colorPicker: true },
  { key: "uiAccentBtnTo", cssVar: "--ui-accent-btn-to", group: "accent", colorPicker: true },
  { key: "uiAccentBtnText", cssVar: "--ui-accent-btn-text", group: "accent", colorPicker: true },
  { key: "brandPrimary", cssVar: "--amber-bright", group: "brand", colorPicker: true },
  { key: "brandSecondary", cssVar: "--violet-bright", group: "brand", colorPicker: true }
];

export const DEFAULT_LIGHT_PALETTE: ThemePalette = {
  surfaceBg: "#f8fafc",
  surfaceCard: "#ffffff",
  textMain: "#0f172a",
  textDim: "#475569",
  textDimmer: "#64748b",
  borderColor: "rgba(15, 23, 42, 0.08)",
  uiAccent: "#7c3aed",
  uiAccentMuted: "rgba(124, 58, 237, 0.1)",
  uiAccentBorder: "rgba(124, 58, 237, 0.32)",
  uiAccentBtnFrom: "#4f46e5",
  uiAccentBtnTo: "#7c3aed",
  uiAccentBtnText: "#ffffff",
  brandPrimary: "#f5a623",
  brandSecondary: "#7c3aed"
};

export const DEFAULT_DARK_PALETTE: ThemePalette = {
  surfaceBg: "#0f1419",
  surfaceCard: "#1d2630",
  textMain: "#f8fafc",
  textDim: "#94a3b8",
  textDimmer: "#64748b",
  borderColor: "rgba(255, 255, 255, 0.08)",
  uiAccent: "#7c3aed",
  uiAccentMuted: "rgba(124, 58, 237, 0.12)",
  uiAccentBorder: "rgba(124, 58, 237, 0.35)",
  uiAccentBtnFrom: "#4f46e5",
  uiAccentBtnTo: "#7c3aed",
  uiAccentBtnText: "#ffffff",
  brandPrimary: "#f5a623",
  brandSecondary: "#7c3aed"
};

export const DEFAULT_THEME_CONFIG: DesignSystemThemeConfig = {
  light: DEFAULT_LIGHT_PALETTE,
  dark: DEFAULT_DARK_PALETTE
};

export const PLATFORM_THEME_SETTING_KEY = "design_system_theme_config";

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const RGBA_RE =
  /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(0|1|0?\.\d+))?\s*\)$/;

function isValidColor(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (HEX_RE.test(v)) return true;
  if (RGBA_RE.test(v)) return true;
  return false;
}

function mergePalette(base: ThemePalette, raw: unknown): ThemePalette {
  const next = { ...base };
  if (!raw || typeof raw !== "object") return next;
  const o = raw as Partial<Record<ThemeTokenKey, unknown>>;
  for (const def of THEME_TOKEN_DEFS) {
    const v = o[def.key];
    if (typeof v === "string" && isValidColor(v)) {
      next[def.key] = v.trim();
    }
  }
  return next;
}

export function mergeThemeConfig(raw: unknown): DesignSystemThemeConfig {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_THEME_CONFIG };
  const o = raw as Partial<DesignSystemThemeConfig>;
  return {
    light: mergePalette(DEFAULT_LIGHT_PALETTE, o.light),
    dark: mergePalette(DEFAULT_DARK_PALETTE, o.dark),
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : undefined
  };
}

export function paletteToCssVars(palette: ThemePalette): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const def of THEME_TOKEN_DEFS) {
    vars[def.cssVar] = palette[def.key];
  }
  vars["--amber"] = palette.brandPrimary;
  vars["--brand"] = palette.uiAccent;
  vars["--violet"] = palette.brandSecondary;
  return vars;
}

export function buildThemeOverrideCss(config: DesignSystemThemeConfig): string {
  const lightVars = paletteToCssVars(config.light);
  const darkVars = paletteToCssVars(config.dark);

  const toBlock = (selector: string, vars: Record<string, string>) =>
    `${selector}{${Object.entries(vars)
      .map(([k, v]) => `${k}:${v}`)
      .join(";")}}`;

  return [
    toBlock(":root,[data-theme=\"light\"]", lightVars),
    toBlock("[data-theme=\"dark\"]", darkVars)
  ].join("");
}

export const THEME_CONFIG_STYLE_ID = "platform-theme-overrides";

export function applyThemeConfigToDocument(config: DesignSystemThemeConfig) {
  if (typeof document === "undefined") return;
  let el = document.getElementById(THEME_CONFIG_STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = THEME_CONFIG_STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = buildThemeOverrideCss(config);
}

export function paletteToInlineStyle(palette: ThemePalette): Record<string, string> {
  return paletteToCssVars(palette);
}

/** Converts #rgb / #rrggbb for native color inputs; rgba returns fallback. */
export function toColorInputValue(value: string, fallback = "#000000"): string {
  const v = value.trim();
  if (HEX_RE.test(v)) {
    if (v.length === 4) {
      return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
    }
    return v;
  }
  const m = v.match(RGBA_RE);
  if (!m) return fallback;
  const r = Number(m[1]).toString(16).padStart(2, "0");
  const g = Number(m[2]).toString(16).padStart(2, "0");
  const b = Number(m[3]).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

export const THEME_UPDATED_EVENT = "traffic:theme-config-updated";
