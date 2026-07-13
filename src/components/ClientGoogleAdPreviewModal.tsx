"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { CreatorModalShell } from "@/components/campaign-creator/CreatorModalShell";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { formatBRL, formatNumber, formatPercent } from "@/lib/format";

type AdDetail = {
  id: string;
  name: string;
  type: string;
  status: string;
  finalUrls: string[];
  headlines: string[];
  descriptions: string[];
  path1: string;
  path2: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  ctr: number;
  averageCpc: number;
};

function displayUrl(finalUrls: string[], path1: string, path2: string): string {
  let host = "";
  try {
    host = new URL(finalUrls[0]).host;
  } catch {
    host = finalUrls[0] ?? "";
  }
  return [host, path1, path2].filter(Boolean).join("/");
}

export function ClientGoogleAdPreviewModal({
  clientId,
  adId,
  since,
  until,
  onClose
}: {
  clientId: string;
  adId: string | null;
  since: string;
  until: string;
  onClose: () => void;
}) {
  const t = useTranslations("client");
  const tMetrics = useTranslations("metrics");
  const locale = useLocale();
  const [ad, setAd] = useState<AdDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!adId) {
      setAd(null);
      setError(null);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    setAd(null);
    fetch(
      `/api/clients/${encodeURIComponent(clientId)}/google-ads/ad-detail?adId=${adId}&since=${since}&until=${until}`
    )
      .then((r) => r.json())
      .then((j) => {
        if (!active) return;
        if (j.ok) setAd(j.ad ?? null);
        else setError(j.error ?? "error");
      })
      .catch(() => active && setError("error"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [clientId, adId, since, until]);

  const tiles: Array<{ label: string; value: string }> = ad
    ? [
        { label: tMetrics("impressions"), value: formatNumber(ad.impressions, locale) },
        { label: tMetrics("clicks"), value: formatNumber(ad.clicks, locale) },
        { label: tMetrics("spend"), value: formatBRL(ad.cost, locale) },
        { label: tMetrics("conversions"), value: formatNumber(ad.conversions, locale) },
        { label: tMetrics("ctr"), value: formatPercent(ad.ctr * 100, 2, locale) },
        { label: tMetrics("cpc"), value: formatBRL(ad.averageCpc, locale) }
      ]
    : [];

  return (
    <CreatorModalShell
      open={!!adId}
      onClose={onClose}
      title={t("googleAdPreviewTitle")}
      subtitle={ad?.name || undefined}
      hideFooter
      width="lg"
    >
      {loading ? (
        <TableSkeleton />
      ) : error ? (
        <div className="text-sm text-[var(--text-dim)]">{t("googleAdsLoadError")}</div>
      ) : ad ? (
        <div className="space-y-4">
          {/* Preview estilo Google */}
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-card)] p-4">
            <div className="text-xs text-[var(--text-dimmer)]">
              {t("googleAdBadge")}
              {ad.finalUrls.length ? (
                <>
                  {" · "}
                  <span className="text-emerald-500">
                    {displayUrl(ad.finalUrls, ad.path1, ad.path2)}
                  </span>
                </>
              ) : null}
            </div>
            <div className="mt-1 text-lg font-medium text-[#1a0dab] dark:text-[#8ab4f8]">
              {ad.headlines.slice(0, 3).join(" | ") || `#${ad.id}`}
            </div>
            <div className="mt-1 text-sm text-[var(--text-dim)]">
              {ad.descriptions.slice(0, 2).join(" ")}
            </div>
          </div>

          {ad.headlines.length ? (
            <div>
              <div className="text-xs font-semibold text-[var(--text-dim)]">
                {t("googleAdHeadlines")} ({ad.headlines.length})
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {ad.headlines.map((h, i) => (
                  <span
                    key={i}
                    className="rounded-lg border border-[var(--border-color)] px-2 py-1 text-xs text-[var(--text-main)]"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {ad.descriptions.length ? (
            <div>
              <div className="text-xs font-semibold text-[var(--text-dim)]">
                {t("googleAdDescriptions")} ({ad.descriptions.length})
              </div>
              <div className="mt-1 space-y-1">
                {ad.descriptions.map((d, i) => (
                  <p key={i} className="text-xs text-[var(--text-dim)]">
                    {d}
                  </p>
                ))}
              </div>
            </div>
          ) : null}

          {ad.finalUrls.length ? (
            <div>
              <div className="text-xs font-semibold text-[var(--text-dim)]">
                {t("googleAdFinalUrl")}
              </div>
              {ad.finalUrls.map((u, i) => (
                <a
                  key={i}
                  href={u}
                  target="_blank"
                  rel="noreferrer"
                  className="ui-link block truncate text-xs"
                >
                  {u}
                </a>
              ))}
            </div>
          ) : null}

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {tiles.map((tile) => (
              <div
                key={tile.label}
                className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-card)] p-2 text-center"
              >
                <div className="text-[10px] uppercase text-[var(--text-dimmer)]">{tile.label}</div>
                <div className="mt-0.5 text-sm font-semibold text-[var(--text-main)]">
                  {tile.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-sm text-[var(--text-dim)]">{t("googleAdNoContent")}</div>
      )}
    </CreatorModalShell>
  );
}
