"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { Link } from "@/i18n/navigation";
import { METRIC_BY_KEY, formatMetricValue, type MetricKey } from "@/lib/dashboard-metrics";
import { CAMPAIGN_PRESETS, presetMetricsFor } from "@/lib/campaign-presets";

type CampaignRef = { id: string; name: string };
type CreativeRow = {
  creativeName: string;
  thumbnailUrl: string | null;
  imageUrl: string | null;
  dominantPreset: string;
  status: string;
  adsCount: number;
  campaigns: CampaignRef[];
  adsets: CampaignRef[];
  clientSlug: string;
  metrics: Partial<Record<MetricKey, number>>;
};
type ClientRow = { id: string; slug: string; name: string };

function statusVariant(s: string): "success" | "warning" | "neutral" {
  if (s === "ACTIVE") return "success";
  if (s === "PAUSED") return "warning";
  return "neutral";
}

export function CreativesPerformanceClient() {
  const t = useTranslations("creativesPerf");
  const tMetrics = useTranslations("metrics");
  const tPresets = useTranslations("campaignPresets");
  const tCampaigns = useTranslations("campaignsPage");
  const locale = useLocale();

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [clientId, setClientId] = useState("");
  const [rows, setRows] = useState<CreativeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState<CreativeRow | null>(null);

  function downloadUrl(r: CreativeRow) {
    const u = r.imageUrl ?? r.thumbnailUrl;
    if (!u) return null;
    return `/api/creatives/download?u=${encodeURIComponent(u)}&name=${encodeURIComponent(r.creativeName)}`;
  }

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((j) => {
        const list = (j.clients ?? []) as ClientRow[];
        setClients(list);
        setClientId((prev) => prev || list.find((c) => c.slug !== "default")?.slug || list[0]?.slug || "");
      })
      .catch(() => {});
  }, []);

  const load = useCallback(() => {
    if (!clientId) {
      setRows([]);
      return;
    }
    setLoading(true);
    fetch(`/api/creatives/performance?clientId=${encodeURIComponent(clientId)}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setRows(j.rows ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo(() => {
    return CAMPAIGN_PRESETS.map((preset) => {
      const metric0 = presetMetricsFor(preset)[0];
      const list = rows
        .filter((r) => r.dominantPreset === preset)
        .sort((a, b) => Number(b.metrics[metric0] ?? 0) - Number(a.metrics[metric0] ?? 0));
      return { preset, list };
    }).filter((g) => g.list.length);
  }, [rows]);

  function statusLabel(s: string) {
    if (s === "ACTIVE") return tCampaigns("statusActive");
    if (s === "PAUSED") return tCampaigns("statusPaused");
    return tCampaigns("statusInactive");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{t("breadcrumb")}</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{t("clientLabel")}:</span>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="ui-select !w-auto !py-1.5 text-sm"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <TableSkeleton
          rows={6}
          columns={["media", "metric", "metric", "metric", "metric", "chips"]}
        />
      ) : groups.length === 0 ? (
        <div className="ui-card p-8 text-center text-sm text-slate-500">{t("empty")}</div>
      ) : (
        <div className="space-y-4">
          {groups.map(({ preset, list }) => {
            const metrics = presetMetricsFor(preset);
            return (
              <div key={preset} className="ui-card overflow-hidden">
                <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">
                  {tPresets(preset)}{" "}
                  <span className="font-normal text-slate-400">({list.length})</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-2">{t("colCreative")}</th>
                        {metrics.map((m) => (
                          <th key={m} className="px-3 py-2 text-right">
                            {tMetrics(METRIC_BY_KEY[m].label)}
                          </th>
                        ))}
                        <th className="px-3 py-2 text-right">{t("colAds")}</th>
                        <th className="px-4 py-2">{t("colCampaigns")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {list.map((r, i) => (
                        <tr key={`${r.creativeName}-${i}`} className="align-top hover:bg-slate-50/60">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {r.thumbnailUrl ? (
                                <button
                                  type="button"
                                  onClick={() => setViewing(r)}
                                  className="group relative h-10 w-10 shrink-0 overflow-hidden rounded-lg"
                                  title={t("view")}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={r.thumbnailUrl}
                                    alt=""
                                    className="h-10 w-10 object-cover transition group-hover:opacity-80"
                                  />
                                  <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-xs text-white opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
                                    🔍
                                  </span>
                                </button>
                              ) : (
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm">
                                  {(r.creativeName[0] ?? "C").toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="max-w-[220px] truncate font-medium text-slate-800">
                                  {r.creativeName}
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                  <Badge variant={statusVariant(r.status)}>
                                    {statusLabel(r.status)}
                                  </Badge>
                                  <button
                                    type="button"
                                    onClick={() => setViewing(r)}
                                    className="text-[11px] font-medium text-violet-600 hover:underline"
                                  >
                                    {t("view")}
                                  </button>
                                  {downloadUrl(r) ? (
                                    <a
                                      href={downloadUrl(r)!}
                                      className="text-[11px] font-medium text-violet-600 hover:underline"
                                    >
                                      {t("download")}
                                    </a>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </td>
                          {metrics.map((m) => (
                            <td
                              key={m}
                              className="px-3 py-3 text-right tabular-nums text-slate-700"
                            >
                              {formatMetricValue(m, Number(r.metrics[m] ?? 0), locale)}
                            </td>
                          ))}
                          <td className="px-3 py-3 text-right tabular-nums text-slate-700">
                            {r.adsCount}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {r.campaigns.slice(0, 3).map((c) => (
                                <Link
                                  key={c.id}
                                  href={`/campaigns/${c.id}?client=${encodeURIComponent(r.clientSlug)}`}
                                  className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 hover:bg-violet-100 hover:text-violet-700"
                                >
                                  {c.name}
                                </Link>
                              ))}
                              {r.campaigns.length > 3 ? (
                                <span className="text-xs text-slate-400">
                                  +{r.campaigns.length - 3}
                                </span>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewing ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4"
          onMouseDown={() => setViewing(null)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
              <div className="min-w-0 truncate text-sm font-semibold text-slate-800">
                {viewing.creativeName}
              </div>
              <button
                type="button"
                onClick={() => setViewing(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label={t("close")}
              >
                ✕
              </button>
            </div>
            <div className="flex min-h-[200px] flex-1 items-center justify-center overflow-auto bg-slate-50 p-4">
              {viewing.imageUrl || viewing.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={viewing.imageUrl ?? viewing.thumbnailUrl ?? ""}
                  alt={viewing.creativeName}
                  className="max-h-[65vh] max-w-full rounded-lg object-contain"
                />
              ) : (
                <div className="text-sm text-slate-400">—</div>
              )}
            </div>
            <div className="flex justify-end border-t border-slate-100 px-5 py-3">
              {downloadUrl(viewing) ? (
                <a href={downloadUrl(viewing)!} className="ui-btn-primary text-sm">
                  ⬇ {t("download")}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
