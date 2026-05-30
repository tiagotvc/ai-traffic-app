"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CampaignManagerClient } from "@/components/CampaignManagerClient";
import { rememberCampaign } from "@/components/CampaignsListClient";
import { Badge } from "@/components/ui/Badge";
import { usePublishPanel } from "@/components/publish/PublishPanelContext";
import { Link } from "@/i18n/navigation";
import { formatBRL, formatRoas } from "@/lib/format";

type CampaignRow = {
  metaCampaignId: string;
  campaignName: string;
  clientName: string;
  clientSlug: string;
  accountLabel: string;
  spend: number;
  conversions: number;
  cpa: number | null;
  roas: number;
  alertCount: number;
  hasAlert: boolean;
  status?: string;
};

type ClientOption = { id: string; slug: string; name: string };

export function CampaignsHubClient() {
  const t = useTranslations("campaignsPage");
  const locale = useLocale();
  const { openPanel } = usePublishPanel();
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientFilter, setClientFilter] = useState("");
  const [q, setQ] = useState("");
  const [onlyAlerts, setOnlyAlerts] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSlug, setSelectedSlug] = useState("");

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
    const params = new URLSearchParams();
    if (clientFilter) params.set("clientId", clientFilter);
    if (q.trim()) params.set("q", q.trim());
    if (onlyAlerts) params.set("onlyAlerts", "1");

    fetch(`/api/campaigns/list?${params}`)
      .then((r) => r.json())
      .then((j) => {
        const list = (j.rows ?? []) as CampaignRow[];
        setRows(list);
        if (selectedId && list.some((r) => r.metaCampaignId === selectedId)) return;
        setSelectedId(null);
        setSelectedSlug("");
      })
      .finally(() => setLoading(false));
  }, [clientFilter, q, onlyAlerts]);

  useEffect(() => {
    load();
    const onReload = () => load();
    window.addEventListener("traffic:campaigns-reload", onReload);
    return () => window.removeEventListener("traffic:campaigns-reload", onReload);
  }, [load]);

  const filteredRows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (r) =>
        (r.campaignName ?? "").toLowerCase().includes(needle) ||
        (r.clientName ?? "").toLowerCase().includes(needle) ||
        (r.accountLabel ?? "").toLowerCase().includes(needle)
    );
  }, [rows, q]);

  const pickCampaign = (r: CampaignRow) => {
    setSelectedId(r.metaCampaignId);
    setSelectedSlug(r.clientSlug);
    rememberCampaign(r.metaCampaignId, r.clientSlug);
  };

  const clientLabel =
    clientFilter === ""
      ? t("allClients")
      : clients.find((c) => c.slug === clientFilter)?.name ?? t("allClients");

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{t("breadcrumb")}</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("subtitleList")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
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

      <div className="flex flex-wrap items-end gap-3 ui-card p-4">
        <div>
          <div className="text-xs text-slate-500">{t("filterClient")}</div>
          <select
            value={clientFilter}
            onChange={(e) => {
              setClientFilter(e.target.value);
              setSelectedId(null);
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
            placeholder={t("search")}
            className="mt-1 w-full rounded-xl ui-input"
          />
        </div>
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={onlyAlerts}
            onChange={(e) => setOnlyAlerts(e.target.checked)}
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
                <th className="px-4 py-3">{t("colCampaign")}</th>
                {!clientFilter ? <th className="px-3 py-3">{t("colClient")}</th> : null}
                <th className="px-3 py-3">{t("colAccount")}</th>
                <th className="px-3 py-3">{t("colSpend")}</th>
                <th className="px-3 py-3">{t("colConversions")}</th>
                <th className="px-3 py-3">CPA</th>
                <th className="px-3 py-3">ROAS</th>
                <th className="px-3 py-3">{t("colAlerts")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={clientFilter ? 7 : 8} className="px-4 py-8 text-center text-slate-500">
                    {t("loading")}
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={clientFilter ? 7 : 8} className="px-4 py-8 text-center text-slate-500">
                    {t("empty")}
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => (
                  <tr
                    key={r.metaCampaignId}
                    className={`cursor-pointer border-t border-slate-100 hover:bg-violet-50/40 ${
                      selectedId === r.metaCampaignId ? "bg-violet-50/60" : ""
                    }`}
                    onClick={() => pickCampaign(r)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{r.campaignName}</div>
                      <div className="text-[10px] text-slate-400">{r.metaCampaignId}</div>
                    </td>
                    {!clientFilter ? <td className="px-3 py-3">{r.clientName}</td> : null}
                    <td className="px-3 py-3 text-slate-500">{r.accountLabel}</td>
                    <td className="px-3 py-3 font-medium">{formatBRL(r.spend, locale)}</td>
                    <td className="px-3 py-3">{r.conversions}</td>
                    <td className="px-3 py-3">
                      {r.cpa != null ? formatBRL(r.cpa, locale) : "—"}
                    </td>
                    <td className="px-3 py-3">{formatRoas(r.roas, locale)}</td>
                    <td className="px-3 py-3">
                      {r.hasAlert ? (
                        <Badge variant="danger">{r.alertCount}</Badge>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedId ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-800">{t("detailTitle")}</h2>
            <Link
              href={`/campaigns/${selectedId}?client=${encodeURIComponent(selectedSlug)}`}
              className="text-xs font-medium text-violet-600 underline"
            >
              {t("openFullPage")}
            </Link>
          </div>
          <CampaignManagerClient
            metaCampaignId={selectedId}
            clientSlug={selectedSlug}
            tab="overview"
            embedded
          />
        </div>
      ) : filteredRows.length > 0 ? (
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
