"use client";

import { useTranslations } from "next-intl";

import type {
  MarketInsightDto,
  MarketInsightSource
} from "@/lib/agency-brain/market-learnings-service";
import type { MarketCoverageLevel } from "@/lib/meta-ad-library/types";

function sourceLabelKey(source: MarketInsightSource): string {
  switch (source) {
    case "META_AD_LIBRARY":
      return "marketInsightSourceAdLibrary";
    case "META_AI_SYNTHESIS":
      return "marketInsightSourceAiSynthesis";
    case "NICHE_AGGREGATED":
      return "marketInsightSourceAggregated";
    default:
      return "marketInsightSourceStatic";
  }
}

function MarketPatternCard({
  insight,
  index,
  onViewEvidence
}: {
  insight: MarketInsightDto;
  index: number;
  onViewEvidence: (insight: MarketInsightDto) => void;
}) {
  const t = useTranslations("agencyBrain");
  const ev = insight.evidence;
  const isLibrary = insight.source === "META_AD_LIBRARY";
  const hook = ev?.hook ?? insight.body.replace(/^"|" —.*$/s, "").trim();
  const patternTitle = isLibrary && ev?.hook ? `"${hook}"` : insight.title;

  return (
    <article
      className={[
        "animate-slide-up overflow-hidden rounded-xl border bg-white shadow-sm transition hover:shadow-md",
        isLibrary ? "border-blue-200/80" : "border-[var(--border-color)]"
      ].join(" ")}
      style={{ animationDelay: `${Math.min(index, 9) * 35}ms` }}
    >
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-dim)]">
            {t("marketPatternDetected")}
          </p>
          <span className="rounded-full bg-[var(--surface-thead)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-dim)]">
            {t(sourceLabelKey(insight.source) as "marketInsightSourceStatic")}
          </span>
        </div>

        <h3 className="mt-2 text-base font-semibold leading-snug text-[var(--text-main)]">{patternTitle}</h3>

        {isLibrary && ev ? (
          <dl className="mt-3 space-y-1.5 text-sm text-[var(--text-dim)]">
            {ev.adsAnalyzed != null ? (
              <div className="flex flex-wrap gap-x-1">
                <dt className="text-[var(--text-dim)]">{t("marketPatternInAds")}</dt>
                <dd className="font-semibold">{t("marketEvidenceAds", { count: ev.adsAnalyzed })}</dd>
              </div>
            ) : null}
            {ev.avgDaysRunning != null ? (
              <div className="flex flex-wrap gap-x-1">
                <dt className="text-[var(--text-dim)]">{t("marketPatternAvgDays")}</dt>
                <dd className="font-semibold">
                  {t("marketPatternDaysValue", { days: ev.avgDaysRunning })}
                </dd>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-x-1">
              <dt className="text-[var(--text-dim)]">{t("marketPatternSource")}</dt>
              <dd className="font-medium">{t("marketInsightSourceAdLibrary")}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-dim)]">{insight.body}</p>
        )}

        <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border-color)] pt-3">
          {ev?.libraryUrl ? (
            <a
              href={ev.libraryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 transition hover:bg-blue-100"
            >
              {t("marketPatternViewEvidence")}
            </a>
          ) : ev ? (
            <button
              type="button"
              className="inline-flex items-center rounded-lg border border-[var(--border-color)] bg-[var(--surface-thead)] px-3 py-1.5 text-xs font-semibold text-[var(--text-dim)] transition hover:bg-[var(--surface-thead)]"
              onClick={() => onViewEvidence(insight)}
            >
              {t("marketPatternViewEvidence")}
            </button>
          ) : null}
          <button
            type="button"
            disabled
            title={t("marketLabsBridgeTooltip")}
            className="inline-flex items-center rounded-lg border border-[rgba(124,58,237,0.2)] bg-white px-3 py-1.5 text-xs font-medium text-violet-400"
          >
            {t("marketPatternDeepDiveLabs")}
          </button>
        </div>
      </div>
    </article>
  );
}

export function MarketLearningsPanel({
  clientId,
  items,
  niche,
  aggregated,
  loading,
  scanning,
  synthesizing,
  aiDisabled,
  hasScan,
  coverageLevel,
  adsAnalyzed,
  competitorsScanned,
  apiConfigured,
  scannedAt,
  onScan,
  onSynthesize
}: {
  clientId: string;
  items: MarketInsightDto[];
  niche: string | null;
  aggregated: boolean;
  loading: boolean;
  scanning: boolean;
  synthesizing: boolean;
  aiDisabled: boolean;
  hasScan: boolean;
  coverageLevel: MarketCoverageLevel;
  adsAnalyzed: number;
  competitorsScanned: number;
  apiConfigured: boolean;
  scannedAt: string | null;
  onScan: () => void;
  onSynthesize: () => void;
}) {
  const t = useTranslations("agencyBrain");

  if (!clientId) {
    return (
      <AgencyBrainEmptyHint
        title={t("selectClientTitle")}
        description={t("learningScopeMarketNeedsClient")}
      />
    );
  }

  const libraryPatterns = items.filter((i) => i.source === "META_AD_LIBRARY");
  const otherInsights = items.filter((i) => i.source !== "META_AD_LIBRARY");
  const patternsFound = libraryPatterns.length;

  function handleViewEvidence(insight: MarketInsightDto) {
    const url = insight.evidence?.libraryUrl;
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-4 pb-2">
      <div className="overflow-hidden rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/40 p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              {t("learningScopeMarket")}
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-[var(--text-main)]">
              {t("marketHeroTitle")}
            </h2>
            <p className="mt-1 max-w-lg text-sm text-[var(--text-dim)]">{t("marketHeroSubtitle")}</p>
            {niche ? (
              <p className="mt-2 text-xs text-[var(--text-dim)]">
                {t("marketInsightNiche", { niche })}
                {aggregated ? ` · ${t("marketInsightAggregatedHint")}` : ""}
              </p>
            ) : (
              <p className="mt-2 text-xs text-amber-700">{t("marketInsightNoNiche")}</p>
            )}
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-blue-500 disabled:opacity-50"
              onClick={onScan}
              disabled={scanning || synthesizing}
            >
              {scanning ? t("marketInsightScanning") : t("marketInsightScan")}
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg border border-emerald-300 bg-white/90 px-4 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:opacity-50"
              onClick={onSynthesize}
              disabled={synthesizing || scanning || aiDisabled || !hasScan}
              title={
                aiDisabled
                  ? t("aiLimit")
                  : !hasScan
                    ? t("marketInsightSynthesizeNeedsScan")
                    : undefined
              }
            >
              {synthesizing ? t("marketInsightSynthesizing") : t("marketInsightSynthesize")}
            </button>
          </div>
        </div>

        {scannedAt ? (
          <div className="mt-4 rounded-xl border border-emerald-100 bg-white/80 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
              {t("marketLastAnalysis")}
            </p>
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              <span className="font-semibold text-[var(--text-main)]">
                {t("marketLastAnalysisAds", { count: adsAnalyzed })}
              </span>
              <span className="text-[var(--text-dim)]">
                {t("marketLastAnalysisCompetitors", { count: competitorsScanned })}
              </span>
              <span className="text-[var(--text-dim)]">
                {t("marketLastAnalysisPatterns", { count: patternsFound })}
              </span>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-xs text-[var(--text-dim)]">{t("marketHeroNoScanYet")}</p>
        )}

        {!apiConfigured ? (
          <p className="mt-2 text-[11px] text-amber-700">{t("marketCoverageNoToken")}</p>
        ) : coverageLevel === "partial" ? (
          <p className="mt-2 text-[11px] text-amber-700">
            {t("marketCoveragePartial", { count: adsAnalyzed })}
          </p>
        ) : null}
      </div>

      {loading ? (
        <div className="flex min-h-[160px] items-center justify-center ui-card border-dashed bg-[var(--surface-card)]/60 text-sm text-[var(--text-dim)]">
          {t("loading")}
        </div>
      ) : items.length === 0 ? (
        <AgencyBrainEmptyHint
          title={t("marketInsightEmptyTitle")}
          description={niche ? t("marketInsightEmptyScan") : t("marketInsightNoNiche")}
        />
      ) : (
        <div className="space-y-3">
          {libraryPatterns.length > 0 ? (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-dim)]">
                {t("marketDiscoveryFeed")}
              </h3>
              <div className="space-y-3">
                {libraryPatterns.map((item, index) => (
                  <MarketPatternCard
                    key={item.id}
                    insight={item}
                    index={index}
                    onViewEvidence={handleViewEvidence}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {otherInsights.length > 0 ? (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-dim)]">
                {t("marketOtherSignals")}
              </h3>
              <div className="space-y-3">
                {otherInsights.map((item, index) => (
                  <MarketPatternCard
                    key={item.id}
                    insight={item}
                    index={index + libraryPatterns.length}
                    onViewEvidence={handleViewEvidence}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}

function AgencyBrainEmptyHint({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-[160px] flex-col items-center justify-center ui-card border-dashed bg-[var(--surface-card)]/60 px-4 py-10 text-center">
      <p className="text-sm font-medium text-[var(--text-dim)]">{title}</p>
      <p className="mt-1 max-w-md text-xs text-[var(--text-dim)]">{description}</p>
    </div>
  );
}
