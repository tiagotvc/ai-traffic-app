"use client";

import { useTranslations } from "next-intl";

import type { ImpactLevel } from "@/lib/agency-brain/insights/types";

const STYLES: Record<ImpactLevel, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-amber-50 text-amber-800",
  high: "bg-rose-50 text-rose-800"
};

export function ImpactPill({ level }: { level: ImpactLevel }) {
  const t = useTranslations("brainInsights");
  return (
    <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${STYLES[level]}`}>
      {t(`impact.${level}`)}
    </span>
  );
}
