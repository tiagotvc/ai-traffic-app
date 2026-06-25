"use client";

import type { ReactNode } from "react";

import {
  DsCard,
  DsFlatDivider,
  DsFlatSection,
  DsFormActions,
  DsFormField,
  type DsFlatSectionTone
} from "@/design-system";

/** @deprecated Use `DsFlatDivider` from `@/design-system`. */
export const SettingsFlatDivider = DsFlatDivider;

/** @deprecated Use `DsFormField` from `@/design-system`. */
export const SettingsField = DsFormField;

/** @deprecated Use `DsFormActions` from `@/design-system`. */
export const SettingsSaveRow = DsFormActions;

/**
 * Seção de configurações — prefira `DsFlatSection` (flat) ou `DsCard` + `DsSectionHeader` em telas novas.
 */
export function SettingsSection({
  title,
  subtitle,
  children,
  accent = "default",
  titleAdornment,
  variant = "card"
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  accent?: DsFlatSectionTone;
  titleAdornment?: ReactNode;
  variant?: "card" | "flat";
}) {
  if (variant === "flat") {
    return (
      <DsFlatSection
        title={title}
        subtitle={subtitle}
        titleAdornment={titleAdornment}
        tone={accent}
      >
        {children}
      </DsFlatSection>
    );
  }

  const borders = {
    default: "border-[var(--border-color)]",
    danger: "border-[rgba(239,68,68,0.25)]",
    amber: "border-[rgba(245,166,35,0.25)]"
  };

  return (
    <DsCard className={borders[accent]}>
      <div className="mb-3">
        <h2 className="flex items-center gap-1.5 font-heading text-sm font-semibold text-[var(--text-main)]">
          {title}
          {titleAdornment}
        </h2>
        {subtitle ? <p className="mt-0.5 text-[11px] text-[var(--text-dimmer)]">{subtitle}</p> : null}
      </div>
      {children}
    </DsCard>
  );
}
