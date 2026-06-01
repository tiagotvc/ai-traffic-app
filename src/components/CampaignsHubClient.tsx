"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CampaignColumnsPicker } from "@/components/CampaignColumnsPicker";
import { CampaignManagerClient } from "@/components/CampaignManagerClient";
import { rememberCampaign } from "@/components/CampaignsListClient";
import { PeriodFilter, periodStateToQuery, type PeriodState } from "@/components/PeriodFilter";
import { Badge } from "@/components/ui/Badge";
import { usePublishPanel } from "@/components/publish/PublishPanelContext";
import { Link } from "@/i18n/navigation";
import {
  COLUMN_I18N_KEYS,
  loadCampaignColumns,
  type CampaignColumnId
} from "@/lib/campaign-table-columns";
import { formatBRL, formatPercent, formatRoas } from "@/lib/format";

type CampaignRow = {
  metaCampaignId: string;
  campaignName: string;
  clientName: string;
  clientSlug: string;
  accountLabel: string;
  spend: number;
  conversions: number;
  leads: number;
  cpl: number | null;
  cpa: number | null;
  roas: number;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  cpc?: number;
  cpm?: number;
  dailyBudget?: number | null;
  alertCount: number;
  hasAlert: boolean;
  status?: string;
  objective?: string | null;
};

type ClientOption = { id: string; slug: string; name: string };
type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";
type ObjectiveFilter = "ALL" | "leads" | "sales" | "traffic";

const PAGE_SIZES = [25, 50, 100, 200] as const;

export function CampaignsHubClient() {
  const t = useTranslations("campaignsPage");
  const locale = useLocale();
  const { openPanel } = usePublishPanel();
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [total, setTotal] = useState(0);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientFilter, setClientFilter] = useState("");
  const [q, setQ] = useState("");
  const [onlyAlerts, setOnlyAlerts] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [objectiveFilter, setObjectiveFilter] = useState<ObjectiveFilter>("ALL");
  const [period, setPeriod] = useState<PeriodState>({ preset: "last7", since: "", until: "" });
  const [pageSize, setPageSize] = useState<number>(50);
  const [page, setPage] = useState(1);
  const [columns, setColumns] = useState<CampaignColumnId[]>(() => loadCampaignColumns());
  const [detailTab, setDetailTab] = useState<"overview" | "adsets">("overview");
  const [loading, setLoading] = useState(true);
  const [enrichError, setEnrichError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSlug, setSelectedSlug] = useState("");
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((j) => {
        const list = (j.clients ?? []) as Array<{ id: string; name: string; slug?: string }>;
        setClients(
          list.map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug ?? c.name.toLowerCase().replace(/\s+/g, "-")
          }))
        );
      });
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams(periodStateToQuery(period));
    if (clientFilter) params.set("clientId", clientFilter);
    if (q.trim()) params.set("q", q.trim());
    if (onlyAlerts) params.set("onlyAlerts", "1");
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (objectiveFilter !== "ALL") params.set("objective", objectiveFilter);
    params.set("limit", String(pageSize));
    params.set("offset", String((page - 1) * pageSize));

    fetch(`/api/campaigns/list?${params.toString()}`)
      .then((r) => r.json())
      .then((j) => {
        const list = (j.rows ?? []) as CampaignRow[];
        setRows(list);
        setTotal(j.total ?? list.length);
        setEnrichError(j.enrichError ?? null);
        if (selectedId && list.some((r) => r.metaCampaignId === selectedId)) return;
        setSelectedId(null);
        setSelectedSlug("");
      })
      .finally(() => setLoading(false));
  }, [clientFilter, q, onlyAlerts, statusFilter, objectiveFilter, period, page, pageSize]);

  useEffect(() => {
    load();
    const onReload = () => load();
    window.addEventListener("traffic:campaigns-reload", onReload);
    return () => window.removeEventListener("traffic:campaigns-reload", onReload);
  }, [load]);

  useEffect(() => {
    if (!selectedId || !detailRef.current) return;
    detailRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedId, detailTab]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const pickCampaign = (r: CampaignRow) => {
    setSelectedId(r.metaCampaignId);
    setSelectedSlug(r.clientSlug);
    rememberCampaign(r.metaCampaignId, r.clientSlug);
  };

  const clientLabel =
    clientFilter === ""
      ? t("allClients")
      : clients.find((c) => c.slug === clientFilter)?.name ?? t("allClients");

  const visibleColumns = useMemo(() => {
    const hideClient = !!clientFilter;
    return columns.filter((c) => !(hideClient && c === "client"));
  }, [columns, clientFilter]);

  const spendLabel =
    period.preset === "all" ? t("colSpendAll") : period.preset === "today" ? t("colSpendToday") : t("colSpend");

  function renderCell(col: CampaignColumnId, r: CampaignRow) {
    switch (col) {
      case "campaign":
        return (
          <td key={col} className="px-4 py-3">
            <div className="font-medium text-slate-900">{r.campaignName}</div>
          </td>
        );
      case "campaignId":
        return (
          <td key={col} className="px-3 py-3 text-[10px] text-slate-400">
            {r.metaCampaignId}
          </td>
        );
      case "client":
        return (
          <td key={col} className="px-3 py-3">
            {r.clientName}
          </td>
        );
      case "account":
        return <td key={col} className="px-3 py-3 text-slate-500">{r.accountLabel}</td>;
      case "spend":
        return (
          <td key={col} className="px-3 py-3 font-medium">
            {formatBRL(r.spend, locale)}
          </td>
        );
      case "conversions":
        return <td key={col} className="px-3 py-3">{Math.round(r.conversions)}</td>;
      case "leads":
        return <td key={col} className="px-3 py-3">{Math.round(r.leads)}</td>;
      case "cpl":
        return (
          <td key={col} className="px-3 py-3">
            {r.cpl != null ? formatBRL(r.cpl, locale) : "—"}
          </td>
        );
      case "cpa":
        return (
          <td key={col} className="px-3 py-3">
            {r.cpa != null ? formatBRL(r.cpa, locale) : "—"}
          </td>
        );
      case "roas":
        return <td key={col} className="px-3 py-3">{formatRoas(r.roas, locale)}</td>;
      case "impressions":
        return <td key={col} className="px-3 py-3">{r.impressions ?? 0}</td>;
      case "clicks":
        return <td key={col} className="px-3 py-3">{r.clicks ?? 0}</td>;
      case "ctr":
        return (
          <td key={col} className="px-3 py-3">
            {r.ctr != null ? formatPercent(r.ctr, 1, locale) : "—"}
          </td>
        );
      case "cpc":
        return (
          <td key={col} className="px-3 py-3">
            {r.cpc != null ? formatBRL(r.cpc, locale) : "—"}
          </td>
        );
      case "cpm":
        return (
          <td key={col} className="px-3 py-3">
            {r.cpm != null ? formatBRL(r.cpm, locale) : "—"}
          </td>
        );
      case "budget":
        return (
          <td key={col} className="px-3 py-3">
            {r.dailyBudget != null ? formatBRL(r.dailyBudget, locale) : "—"}
          </td>
        );
      case "status":
        return (
          <td key={col} className="px-3 py-3">
            <Badge variant={r.status === "ACTIVE" ? "success" : "neutral"}>
              {r.status === "ACTIVE" ? t("statusActive") : t("statusInactive")}
            </Badge>
          </td>
        );
      case "alerts":
        return (
          <td key={col} className="px-3 py-3">
            {r.hasAlert ? (
              <Badge variant="danger">{r.alertCount}</Badge>
            ) : (
              <span className="text-slate-400">—</span>
            )}
          </td>
        );
      default:
        return null;
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{t("breadcrumb")}</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("subtitleList")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CampaignColumnsPicker onChange={setColumns} />
          <button type="button" onClick={load} className="ui-btn-secondary text-sm">
            {t("refresh")}
          </button>
          <button
            type="button"
            onClick={() => openPanel({ clientSlug: clientFilter || selectedSlug || undefined })}
            className="ui-btn-primary text-sm"
          >
            {t("newCampaign")}
          </button>
        </div>
      </div>

      {enrichError ? <p className="text-xs text-amber-700">{enrichError}</p> : null}

      <div className="flex flex-wrap items-end gap-3 ui-card p-4">
        <PeriodFilter
          value={period}
          onChange={(next) => {
            setPeriod(next);
            setPage(1);
          }}
        />
        <div>
          <div className="text-xs text-slate-500">{t("filterClient")}</div>
          <select
            value={clientFilter}
            onChange={(e) => {
              setClientFilter(e.target.value);
              setSelectedId(null);
              setPage(1);
            }}
            className="mt-1 rounded-xl ui-input min-w-[200px]"
          >
            <option value="">{t("allClients")}</option>
            {clients.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[200px] flex-1">
          <div className="text-xs text-slate-500">{t("search")}</div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder={t("search")}
            className="mt-1 w-full rounded-xl ui-input"
          />
        </div>
        <div>
          <div className="text-xs text-slate-500">{t("filterStatus")}</div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as StatusFilter);
              setPage(1);
            }}
            className="mt-1 rounded-xl ui-input min-w-[140px]"
          >
            <option value="ALL">{t("statusAll")}</option>
            <option value="ACTIVE">{t("statusActive")}</option>
            <option value="INACTIVE">{t("statusInactive")}</option>
          </select>
        </div>
        <div>
          <div className="text-xs text-slate-500">{t("filterObjective")}</div>
          <select
            value={objectiveFilter}
            onChange={(e) => {
              setObjectiveFilter(e.target.value as ObjectiveFilter);
              setPage(1);
            }}
            className="mt-1 rounded-xl ui-input min-w-[140px]"
          >
            <option value="ALL">{t("objectiveAll")}</option>
            <option value="leads">{t("objectiveLeads")}</option>
            <option value="sales">{t("objectiveSales")}</option>
            <option value="traffic">{t("objectiveTraffic")}</option>
          </select>
        </div>
        <div>
          <div className="text-xs text-slate-500">{t("pageSizeLabel")}</div>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="mt-1 rounded-xl ui-input min-w-[100px]"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={onlyAlerts}
            onChange={(e) => {
              setOnlyAlerts(e.target.checked);
              setPage(1);
            }}
            className="accent-violet-600"
          />
          {t("onlyAlerts")}
        </label>
      </div>

      {clientFilter ? (
        <p className="text-xs text-violet-800">
          {t("clientScopeHint", { client: clientLabel })}
        </p>
      ) : null}

      <div className="ui-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                {visibleColumns.map((col) => (
                  <th key={col} className="px-3 py-3 first:pl-4">
                    {col === "spend" ? spendLabel : t(COLUMN_I18N_KEYS[col] as "colCampaign")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={visibleColumns.length} className="px-4 py-8 text-center text-slate-500">
                    {t("loading")}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length} className="px-4 py-8 text-center text-slate-500">
                    {t("empty")}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.metaCampaignId}
                    className={`cursor-pointer border-t border-slate-100 hover:bg-violet-50/40 ${
                      selectedId === r.metaCampaignId ? "bg-violet-50/60" : ""
                    }`}
                    onClick={() => pickCampaign(r)}
                  >
                    {visibleColumns.map((col) => renderCell(col, r))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          <span>
            {t("pagination", {
              from: total ? (page - 1) * pageSize + 1 : 0,
              to: Math.min(page * pageSize, total),
              total
            })}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded border px-2 py-1 disabled:opacity-40"
            >
              ‹
            </button>
            <span className="px-2 py-1">
              {page} / {pageCount}
            </span>
            <button
              type="button"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => p + 1)}
              className="rounded border px-2 py-1 disabled:opacity-40"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {selectedId ? (
        <div ref={detailRef} className="space-y-2 scroll-mt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-800">{t("detailTitle")}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-lg border border-slate-200 p-0.5 text-xs">
                {(
                  [
                    ["overview", t("tabOverview")],
                    ["adsets", t("tabAdsets")]
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDetailTab(key)}
                    className={`rounded-md px-2 py-1 font-medium ${
                      detailTab === key ? "bg-violet-100 text-violet-700" : "text-slate-500"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <Link
                href={`/campaigns/${selectedId}?client=${encodeURIComponent(selectedSlug)}`}
                className="text-xs font-medium text-violet-600 underline"
              >
                {t("openFullPage")}
              </Link>
            </div>
          </div>
          <CampaignManagerClient
            metaCampaignId={selectedId}
            clientSlug={selectedSlug}
            tab={detailTab}
            embedded
          />
        </div>
      ) : total > 0 ? (
        <p className="text-center text-sm text-slate-500">{t("pickRowHint")}</p>
      ) : (
        <div className="ui-card space-y-4 p-8 text-center">
          <p className="text-lg font-semibold text-slate-800">{t("emptyTitle")}</p>
          <p className="mx-auto max-w-lg text-sm text-slate-500">{t("emptyExplain")}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => openPanel()} className="ui-btn-primary">
              {t("createFirst")}
            </button>
            <button
              type="button"
              onClick={() => fetch("/api/sync/run", { method: "POST" }).then(load)}
              className="ui-btn-secondary"
            >
              {t("syncNow")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
