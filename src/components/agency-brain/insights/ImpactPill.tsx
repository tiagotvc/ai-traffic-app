"use client";

import { useTranslations } from "next-intl";

import type { ImpactLevel } from "@/lib/agency-brain/insights/types";

const STYLES: Record<ImpactLevel, string> = {
  low: "bg-[var(--surface-thead)]0/10 text-[var(--text-dim)]",
  medium: "bg-amber-500/10 text-amber-800",
  high: "bg-rose-500/10 text-rose-800"
};

export function ImpactPill({ level }: { level: ImpactLevel }) {
  const t = useTranslations("brainInsights");
  return (
    <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${STYLES[level]}`}>
      {t(`impact.${level}`)}
    </span>
  );
}
