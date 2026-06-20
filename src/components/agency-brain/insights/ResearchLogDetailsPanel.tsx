"use client";

import { useTranslations } from "next-intl";

import { hasLogDetails } from "@/lib/agency-brain/insights/research-log-repository";
import type { ResearchLogDetails } from "@/lib/agency-brain/insights/types";

export function ResearchLogDetailsPanel({ details }: { details: ResearchLogDetails }) {
  const t = useTranslations("brainInsights");

  if (!hasLogDetails(details)) return null;

  return (
    <div className="mt-3 space-y-3 border-t border-[var(--border-color)] pt-3">
      {(details.niche || details.marketCountry || details.dateRange) && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--text-dim)]">
          {details.niche ? (
            <span>
              {t("logDetailNiche")}: <strong className="text-[var(--text-dim)]">{details.niche}</strong>
            </span>
          ) : null}
          {details.marketCountry ? (
            <span>
              {t("logDetailCountry")}:{" "}
              <strong className="text-[var(--text-dim)]">{details.marketCountry}</strong>
            </span>
          ) : null}
          {details.dateRange ? (
            <span>
              {t("logDetailPeriod")}:{" "}
              <strong className="text-[var(--text-dim)]">{details.dateRange}</strong>
            </span>
          ) : null}
        </div>
      )}

      {details.searchTerms && details.searchTerms.length > 0 ? (
        <section>
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-dim)]">
            {t("logDetailSearchTerms")}
          </h4>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {details.searchTerms.map((term) => (
              <span
                key={term}
                className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-800"
              >
                {term}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {details.competitors && details.competitors.length > 0 ? (
        <section>
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-dim)]">
            {t("logDetailCompetitors")}
          </h4>
          <ul className="mt-1.5 space-y-1">
            {details.competitors.map((c) => (
              <li
                key={c.name}
                className="flex items-center justify-between rounded-md bg-[var(--surface-thead)] px-2.5 py-1 text-xs text-[var(--text-dim)]"
              >
                <span className="font-medium">{c.name}</span>
                <span className="text-[var(--text-dim)]">
                  {t("logDetailAdsFound", { count: c.adsFound })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {details.adSamples && details.adSamples.length > 0 ? (
        <section>
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-dim)]">
            {t("logDetailAdSamples")}
          </h4>
          <ul className="mt-1.5 space-y-2">
            {details.adSamples.map((ad, index) => (
              <li
                key={`${ad.advertiser}-${index}`}
                className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-thead)] px-3 py-2"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-[var(--text-main)]">{ad.advertiser}</p>
                  <div className="flex flex-wrap gap-1.5 text-[10px] text-[var(--text-dim)]">
                    {ad.format ? (
                      <span className="rounded bg-white px-1.5 py-px">{ad.format}</span>
                    ) : null}
                    {ad.daysRunning != null ? (
                      <span>{t("logDetailDaysRunning", { days: ad.daysRunning })}</span>
                    ) : null}
                  </div>
                </div>
                <p className="mt-1 text-sm leading-snug text-[var(--text-dim)]">&ldquo;{ad.hook}&rdquo;</p>
                {ad.cta ? (
                  <p className="mt-1 text-[11px] text-[var(--text-dim)]">
                    CTA: <span className="font-medium text-[var(--text-dim)]">{ad.cta}</span>
                  </p>
                ) : null}
                {ad.libraryUrl ? (
                  <a
                    href={ad.libraryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1.5 inline-block text-[11px] ui-link font-medium"
                  >
                    {t("logDetailViewAd")}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {details.topHooks && details.topHooks.length > 0 ? (
        <section>
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-dim)]">
            {t("logDetailTopHooks")}
          </h4>
          <ul className="mt-1.5 space-y-1 text-xs text-[var(--text-dim)]">
            {details.topHooks.map((h) => (
              <li key={h.hook} className="rounded-md bg-[rgba(124,58,237,0.06)]/50 px-2 py-1">
                &ldquo;{h.hook}&rdquo; — {t("logDetailHookStats", { count: h.count, days: h.avgDays ?? 0 })}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {details.campaignsAnalyzed && details.campaignsAnalyzed.length > 0 ? (
        <section>
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-dim)]">
            {t("logDetailCampaigns")}
          </h4>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {details.campaignsAnalyzed.map((c) => (
              <span
                key={c}
                className="rounded-md bg-fuchsia-50 px-2 py-0.5 text-[11px] font-medium text-fuchsia-800"
              >
                {c}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {details.campaignPatterns && details.campaignPatterns.length > 0 ? (
        <section>
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-dim)]">
            {t("logDetailPatterns")}
          </h4>
          <ul className="mt-1.5 space-y-1.5">
            {details.campaignPatterns.map((p) => (
              <li key={p.label} className="text-xs">
                <p className="font-medium text-[var(--text-main)]">{p.label}</p>
                {p.detail ? <p className="text-[var(--text-dim)]">{p.detail}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {details.aiSuggestions && details.aiSuggestions.length > 0 ? (
        <section>
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-dim)]">
            {t("logDetailAiSuggestions")}
          </h4>
          <ul className="mt-1.5 space-y-1.5">
            {details.aiSuggestions.map((s) => (
              <li key={s.title} className="text-xs">
                <p className="font-medium text-[var(--text-main)]">{s.title}</p>
                {s.body ? <p className="text-[var(--text-dim)]">{s.body}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {details.synthesisItems && details.synthesisItems.length > 0 ? (
        <section>
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-dim)]">
            {t("logDetailSynthesis")}
          </h4>
          <ul className="mt-1.5 space-y-1.5">
            {details.synthesisItems.map((s) => (
              <li key={s.title} className="text-xs">
                <p className="font-medium text-[var(--text-main)]">{s.title}</p>
                {s.body ? <p className="text-[var(--text-dim)]">{s.body}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
