"use client";

import { useTranslations } from "next-intl";

export function EvidenceBlock({ bullets }: { bullets: string[] }) {
  const t = useTranslations("brainInsights");

  if (bullets.length === 0) return null;

  return (
    <section className="ui-card p-5">
      <h2 className="font-heading text-sm font-bold text-[var(--text-main)]">{t("whyBelievesTitle")}</h2>
      <ul className="mt-3 space-y-2">
        {bullets.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-[var(--text-dim)]">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[rgba(124,58,237,0.06)]0" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
