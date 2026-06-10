"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/Badge";

export type CreativeRow = {
  id: string;
  title: string;
  description: string;
  type: "image" | "video" | "carousel" | "copy" | "headline" | "description";
  format: string;
  clientName: string;
  clientSlug: string;
  campaignName: string;
  status: "active" | "testing" | "paused" | "archived";
  performance: "high" | "very_high" | "medium" | "low";
  metricLabel: string;
  usageAds: number;
  usageCampaigns: number;
  createdAt: string;
  thumbnailUrl?: string | null;
};

const STAT_KEYS = ["total", "images", "videos", "carousels", "copy", "headlines", "descriptions"] as const;

function typeIcon(type: CreativeRow["type"]) {
  if (type === "image") return "🖼️";
  if (type === "video") return "▶️";
  if (type === "carousel") return "🎠";
  if (type === "copy") return "📝";
  if (type === "description") return "📄";
  return "H";
}

function statusVariant(s: CreativeRow["status"]) {
  if (s === "active") return "success";
  if (s === "testing") return "warning";
  if (s === "paused") return "neutral";
  return "neutral";
}

function perfLabel(p: CreativeRow["performance"], t: (k: string) => string) {
  if (p === "very_high") return t("perfVeryHigh");
  if (p === "high") return t("perfHigh");
  if (p === "medium") return t("perfMedium");
  return t("perfLow");
}

export function CreativesLibraryView({
  fetchUrl,
  translationNs = "creatives",
  lockedCampaignName,
  showStats = true,
  showFilters = true,
  onTotalChange
}: {
  fetchUrl: string;
  translationNs?: "creatives" | "creativesPage";
  lockedCampaignName?: string;
  showStats?: boolean;
  showFilters?: boolean;
  onTotalChange?: (total: number) => void;
}) {
  const t = useTranslations(translationNs);
  const locale = useLocale();
  const [rows, setRows] = useState<CreativeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<"all" | "active" | "testing" | "paused" | "archived">("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const load = useCallback(() => {
    setLoading(true);
    fetch(fetchUrl)
      .then((r) => r.json())
      .then((j) => {
        const apiRows = (j.ok === false ? [] : (j.rows ?? [])) as CreativeRow[];
        const total = j.total ?? apiRows.length;
        setRows(apiRows);
        setSelectedId(apiRows[0]?.id ?? null);
        onTotalChange?.(total);
      })
      .catch(() => {
        setRows([]);
        setSelectedId(null);
        onTotalChange?.(0);
      })
      .finally(() => setLoading(false));
  }, [fetchUrl, onTotalChange]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = rows;
    if (tab === "active") list = list.filter((r) => r.status === "active");
    if (tab === "testing") list = list.filter((r) => r.status === "testing");
    if (tab === "paused") list = list.filter((r) => r.status === "paused");
    if (tab === "archived") list = list.filter((r) => r.status === "archived");
    if (q.trim()) {
      const needle = q.toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(needle) ||
          r.clientName.toLowerCase().includes(needle) ||
          r.campaignName.toLowerCase().includes(needle)
      );
    }
    return list;
  }, [rows, tab, q]);

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const selected = rows.find((r) => r.id === selectedId) ?? paged[0] ?? null;

  const counts = useMemo(
    () => ({
      all: rows.length,
      active: rows.filter((r) => r.status === "active").length,
      testing: rows.filter((r) => r.status === "testing").length,
      paused: rows.filter((r) => r.status === "paused").length,
      archived: rows.filter((r) => r.status === "archived").length
    }),
    [rows]
  );

  const typeCounts = useMemo(
    () => ({
      images: rows.filter((r) => r.type === "image").length,
      videos: rows.filter((r) => r.type === "video").length,
      carousels: rows.filter((r) => r.type === "carousel").length,
      copy: rows.filter((r) => r.type === "copy").length,
      headlines: rows.filter((r) => r.type === "headline").length,
      descriptions: rows.filter((r) => r.type === "description").length
    }),
    [rows]
  );

  return (
    <div className="space-y-5">
      {showStats ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {STAT_KEYS.map((key) => (
            <div key={key} className="ui-card p-3">
              <div className="text-lg">{key === "total" ? "📦" : "📊"}</div>
              <div className="mt-1 text-xs text-slate-500">{t(`stats.${key}`)}</div>
              <div className="mt-1 text-lg font-bold text-slate-900">
                {loading
                  ? "…"
                  : key === "total"
                    ? counts.all.toLocaleString(locale)
                    : typeCounts[key].toLocaleString(locale)}
              </div>
              {key === "total" && !loading ? (
                <div className="text-[10px] font-medium text-emerald-600">↑ 18%</div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {showFilters ? (
        <div className="flex flex-wrap gap-2">
          <select className="ui-select w-auto min-w-[140px]">
            <option>{t("filterClient")}</option>
          </select>
          <select className="ui-select w-auto min-w-[140px]" disabled={!!lockedCampaignName}>
            <option>{lockedCampaignName ?? t("filterCampaign")}</option>
          </select>
          <select className="ui-select w-auto min-w-[120px]">
            <option>{t("filterFormat")}</option>
          </select>
          <select className="ui-select w-auto min-w-[120px]">
            <option>{t("filterStatus")}</option>
          </select>
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder={t("search")}
            className="ui-input min-w-[200px] flex-1"
          />
          <button type="button" className="ui-btn-secondary text-sm">
            {t("moreFilters")}
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-1 border-b border-slate-200">
            {(
              [
                ["all", t("tabAll", { count: loading ? "…" : counts.all })],
                ["active", t("tabActive", { count: loading ? "…" : counts.active })],
                ["testing", t("tabTesting", { count: loading ? "…" : counts.testing })],
                ["paused", t("tabPaused", { count: loading ? "…" : counts.paused })],
                ["archived", t("tabArchived", { count: loading ? "…" : counts.archived })]
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setTab(key);
                  setPage(1);
                }}
                className={`border-b-2 px-3 py-2 text-sm font-medium ${
                  tab === key
                    ? "border-violet-600 text-violet-600"
                    : "border-transparent text-slate-500"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="ui-card mt-0 overflow-hidden rounded-t-none">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="w-10 px-3 py-3" />
                    <th className="px-3 py-3">{t("colCreative")}</th>
                    <th className="px-3 py-3">{t("colClient")}</th>
                    <th className="px-3 py-3">{t("colFormat")}</th>
                    <th className="px-3 py-3">{t("colStatus")}</th>
                    <th className="px-3 py-3">{t("colPerformance")}</th>
                    <th className="px-3 py-3">{t("colUsage")}</th>
                    <th className="w-10 px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {loading && rows.length === 0 ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td colSpan={8} className="px-4 py-4">
                          <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
                        </td>
                      </tr>
                    ))
                  ) : paged.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
                        {t("empty")}
                      </td>
                    </tr>
                  ) : (
                    paged.map((row) => (
                      <tr
                        key={row.id}
                        onClick={() => setSelectedId(row.id)}
                        className={`cursor-pointer border-t border-slate-100 transition hover:bg-violet-50/50 ${
                          selectedId === row.id ? "bg-violet-50" : ""
                        }`}
                      >
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            className="accent-violet-600"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            {row.thumbnailUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={row.thumbnailUrl}
                                alt=""
                                className="h-12 w-12 shrink-0 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-lg">
                                {typeIcon(row.type)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-medium text-slate-900">{row.title}</div>
                              <div className="line-clamp-1 text-xs text-slate-500">{row.description}</div>
                              <span className="mt-1 inline-block rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
                                {row.format}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-slate-600">
                          <div className="font-medium">{row.clientName}</div>
                          <div className="text-xs text-slate-400">{row.campaignName}</div>
                        </td>
                        <td className="px-3 py-3 text-slate-600">{row.format}</td>
                        <td className="px-3 py-3">
                          <Badge variant={statusVariant(row.status)}>{t(`status.${row.status}`)}</Badge>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                              row.performance === "very_high" || row.performance === "high"
                                ? "bg-emerald-50 text-emerald-700"
                                : row.performance === "medium"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {perfLabel(row.performance, t)}
                          </span>
                          <div className="text-xs font-semibold text-slate-800">{row.metricLabel}</div>
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-500">
                          {t("usage", { ads: row.usageAds, campaigns: row.usageCampaigns })}
                        </td>
                        <td className="px-3 py-3 text-slate-400">⋮</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
              <span>
                {t("pagination", {
                  from: filtered.length ? (page - 1) * pageSize + 1 : 0,
                  to: Math.min(page * pageSize, filtered.length),
                  total: filtered.length
                })}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded border border-slate-200 px-2 py-1 disabled:opacity-40"
                >
                  ‹
                </button>
                <span className="rounded bg-violet-600 px-2 py-1 text-white">{page}</span>
                <button
                  type="button"
                  disabled={page * pageSize >= filtered.length}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded border border-slate-200 px-2 py-1 disabled:opacity-40"
                >
                  ›
                </button>
              </div>
            </div>
          </div>
        </div>

        {selected ? (
          <aside className="ui-card sticky top-0 max-h-[calc(100vh-8rem)] overflow-y-auto p-4">
            <div className="flex items-start justify-between">
              <h2 className="text-sm font-semibold text-slate-900">{t("detailTitle")}</h2>
              <button type="button" onClick={() => setSelectedId(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            {selected.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selected.thumbnailUrl}
                alt=""
                className="mt-4 h-32 w-full rounded-xl object-cover"
              />
            ) : (
              <div className="mt-4 flex h-32 items-center justify-center rounded-xl bg-slate-100 text-4xl">
                {typeIcon(selected.type)}
              </div>
            )}
            <div className="mt-3 font-semibold text-slate-900">{selected.title}</div>
            <Badge variant="brand">{selected.format}</Badge>
            <p className="mt-2 text-xs text-slate-500">ID: {selected.id.slice(0, 8)}…</p>

            <section className="mt-4 border-t border-slate-100 pt-4">
              <h3 className="text-xs font-semibold uppercase text-slate-500">{t("detailInfo")}</h3>
              <dl className="mt-2 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">{t("detailClient")}</dt>
                  <dd>
                    {selected.clientSlug ? (
                      <Link href={`/clients/${selected.clientSlug}`} className="font-medium text-violet-600">
                        {selected.clientName}
                      </Link>
                    ) : (
                      <span className="text-slate-800">{selected.clientName}</span>
                    )}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">{t("detailCampaign")}</dt>
                  <dd className="text-slate-800">{selected.campaignName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">{t("detailStatus")}</dt>
                  <dd>
                    <Badge variant={statusVariant(selected.status)}>{t(`status.${selected.status}`)}</Badge>
                  </dd>
                </div>
              </dl>
            </section>

            <section className="mt-4 border-t border-slate-100 pt-4">
              <h3 className="text-xs font-semibold uppercase text-slate-500">{t("detailPerformance")}</h3>
              <div className="mt-2 grid grid-cols-2 gap-2 text-center text-xs">
                {[
                  ["125.430", t("metricImpressions")],
                  ["2.843", t("metricClicks")],
                  ["2,27%", "CTR"],
                  ["R$ 1.240", t("metricSpend")],
                  ["128", t("metricConversions")],
                  [selected.metricLabel, "ROAS"]
                ].map(([val, lbl]) => (
                  <div key={lbl} className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                    <div className="font-bold text-slate-900">{val}</div>
                    <div className="text-slate-500">{lbl}</div>
                  </div>
                ))}
              </div>
            </section>

            <div className="mt-4 space-y-2">
              <button type="button" className="ui-btn-secondary w-full text-sm">
                {t("actionView")}
              </button>
              <button type="button" className="ui-btn-primary w-full text-sm">
                {t("actionUse")}
              </button>
              <button type="button" className="ui-btn-danger w-full text-sm">
                {t("actionArchive")}
              </button>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
