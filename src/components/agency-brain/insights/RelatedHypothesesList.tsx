"use client";

import { useTranslations } from "next-intl";

import { StatusBadge } from "@/components/agency-brain/insights/StatusBadge";
import { Link } from "@/i18n/navigation";
import type { InsightHypothesis } from "@/lib/agency-brain/insights/types";

export function RelatedHypothesesList({ hypotheses }: { hypotheses: InsightHypothesis[] }) {
  const t = useTranslations("brainInsights");

  if (hypotheses.length === 0) {
    return <p className="text-sm text-slate-500">{t("noRelatedHypotheses")}</p>;
  }

  return (
    <ul className="space-y-2">
      {hypotheses.map((h) => (
        <li key={h.id}>
          <Link
            href={`/agency-brain/hypotheses/${h.id}`}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 transition hover:border-violet-200 hover:bg-violet-50/30"
          >
            <span className="text-sm font-medium text-slate-900">{h.title}</span>
            <StatusBadge kind="hypothesis" status={h.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
