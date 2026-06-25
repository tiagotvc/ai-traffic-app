/**
 * Orion Agency design tokens — source of truth mirrors CSS variables in globals.css.
 * UX Pilot export: uxpilot-export/ (light mode + dark sidebar).
 */
export const dsTokens = {
  /** Page canvas */
  surfaceBg: "var(--surface-bg)",
  surfaceCard: "var(--surface-card)",
  surfaceHeader: "var(--surface-header)",
  surfaceThead: "var(--surface-thead)",
  border: "var(--border-color)",
  borderHover: "var(--border-hover)",
  rowHover: "var(--row-hover)",

  /** Sidebar — always dark */
  sidebarBg: "var(--sidebar-bg)",
  sidebarBorder: "var(--sidebar-border)",

  /** Brand */
  amber: "var(--amber)",
  violet: "var(--violet)",
  uiAccent: "var(--ui-accent)",
  uiAccentMuted: "var(--ui-accent-muted)",
  uiAccentBorder: "var(--ui-accent-border)",
  success: "var(--success)",
  danger: "var(--danger)",

  /** Text */
  textMain: "var(--text-main)",
  textDim: "var(--text-dim)",
  textDimmer: "var(--text-dimmer)",

  /** Agency Brain */
  brainShelfBg: "var(--brain-shelf-bg)",
  brainShelfBorder: "var(--brain-shelf-border)"
} as const;

export type DsBadgeTone = "success" | "warning" | "danger" | "info" | "beta" | "neutral" | "amber";
export type DsTrendDirection = "up" | "down" | "neutral";
