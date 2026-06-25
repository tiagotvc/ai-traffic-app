"use client";

import { useLocale, useTranslations } from "next-intl";
import { Building2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { FilterSelectDropdown } from "@/components/FilterSelectDropdown";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { Link } from "@/i18n/navigation";
import { METRIC_BY_KEY, formatMetricValue, type MetricKey } from "@/lib/dashboard-metrics";
import { CAMPAIGN_PRESETS, presetMetricsFor } from "@/lib/campaign-presets";
import { DsPageHeader } from "@/design-system";

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
    fetch("/api/clients?minimal=1")
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
      <DsPageHeader
        breadcrumbs={t("breadcrumb")}
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <FilterSelectDropdown
            icon={<Building2 size={14} />}
            label={t("clientLabel")}
            placeholder={t("clientLabel")}
            value={clientId}
            onChange={setClientId}
            clearable={false}
            options={clients.map((c) => ({ value: c.slug, label: c.name }))}
          />
        }
      />

      {loading ? (
        <TableSkeleton
          rows={6}
          columns={["media", "metric", "metric", "metric", "metric", "chips"]}
        />
      ) : groups.length === 0 ? (
        <div className="ui-card p-8 text-center text-sm text-[var(--text-dim)]">{t("empty")}</div>
      ) : (
        <div className="space-y-4">
          {groups.map(({ preset, list }) => {
            const metrics = presetMetricsFor(preset);
            return (
              <div key={preset} className="ui-card overflow-hidden">
                <div className="border-b border-[var(--border-color)] px-4 py-3 text-sm font-semibold text-[var(--text-main)]">
                  {tPresets(preset)}{" "}
                  <span className="font-normal text-[var(--text-dimmer)]">({list.length})</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="bg-[var(--surface-thead)] text-[11px] font-semibold uppercase text-[var(--text-dim)]">
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
                    <tbody className="divide-y divide-[var(--border-color)]">
                      {list.map((r, i) => (
                        <tr key={`${r.creativeName}-${i}`} className="align-top hover:bg-[var(--surface-bg)]/60">
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
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-bg)] text-sm">
                                  {(r.creativeName[0] ?? "C").toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="max-w-[220px] truncate font-medium text-[var(--text-main)]">
                                  {r.creativeName}
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                  <Badge variant={statusVariant(r.status)}>
                                    {statusLabel(r.status)}
                                  </Badge>
                                  <button
                                    type="button"
                                    onClick={() => setViewing(r)}
                                    className="text-[11px] font-medium text-[var(--violet)] hover:underline"
                                  >
                                    {t("view")}
                                  </button>
                                  {downloadUrl(r) ? (
                                    <a
                                      href={downloadUrl(r)!}
                                      className="text-[11px] font-medium text-[var(--violet)] hover:underline"
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
                              className="px-3 py-3 text-right tabular-nums text-[var(--text-dim)]"
                            >
                              {formatMetricValue(m, Number(r.metrics[m] ?? 0), locale)}
                            </td>
                          ))}
                          <td className="px-3 py-3 text-right tabular-nums text-[var(--text-dim)]">
                            {r.adsCount}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {r.campaigns.slice(0, 3).map((c) => (
                                <Link
                                  key={c.id}
                                  href={`/campaigns/${c.id}?client=${encodeURIComponent(r.clientSlug)}`}
                                  className="rounded-md bg-[var(--surface-bg)] px-2 py-0.5 text-xs text-[var(--text-dim)] hover:bg-[rgba(124,58,237,0.1)] hover:text-[var(--violet-bright)]"
                                >
                                  {c.name}
                                </Link>
                              ))}
                              {r.campaigns.length > 3 ? (
                                <span className="text-xs text-[var(--text-dimmer)]">
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onMouseDown={() => setViewing(null)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-[var(--surface-card)] shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-[var(--border-color)] px-5 py-3">
              <div className="min-w-0 truncate text-sm font-semibold text-[var(--text-main)]">
                {viewing.creativeName}
              </div>
              <button
                type="button"
                onClick={() => setViewing(null)}
                className="rounded-lg p-1 text-[var(--text-dimmer)] hover:bg-[var(--surface-bg)] hover:text-[var(--text-dim)]"
                aria-label={t("close")}
              >
                ✕
              </button>
            </div>
            <div className="flex min-h-[200px] flex-1 items-center justify-center overflow-auto bg-[var(--surface-bg)] p-4">
              {viewing.imageUrl || viewing.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={viewing.imageUrl ?? viewing.thumbnailUrl ?? ""}
                  alt={viewing.creativeName}
                  className="max-h-[65vh] max-w-full rounded-lg object-contain"
                />
              ) : (
                <div className="text-sm text-[var(--text-dimmer)]">—</div>
              )}
            </div>
            <div className="flex justify-end border-t border-[var(--border-color)] px-5 py-3">
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
