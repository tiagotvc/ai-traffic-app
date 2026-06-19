"use client";

import { useTranslations } from "next-intl";

export function EvidenceBlock({ bullets }: { bullets: string[] }) {
  const t = useTranslations("brainInsights");

  if (bullets.length === 0) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-bold text-slate-900">{t("whyBelievesTitle")}</h2>
      <ul className="mt-3 space-y-2">
        {bullets.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
