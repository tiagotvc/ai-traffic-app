"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/Badge";
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
};

const LAST_CAMPAIGN_KEY = "traffic-ai-last-campaign";

export function rememberCampaign(metaCampaignId: string, clientSlug: string) {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(LAST_CAMPAIGN_KEY, JSON.stringify({ metaCampaignId, clientSlug }));
  }
}

export function CampaignsListClient() {
  const t = useTranslations("campaignsPage");
  const locale = useLocale();
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [q, setQ] = useState("");
  const [onlyAlerts, setOnlyAlerts] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (onlyAlerts) params.set("onlyAlerts", "1");
    fetch(`/api/command-center/campaigns?${params}`)
      .then((r) => r.json())
      .then((j) => setRows(j.rows ?? []))
      .finally(() => setLoading(false));
  }, [q, onlyAlerts]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => rows, [rows]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{t("breadcrumb")}</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
        </div>
        <Link href="/campaigns?publish=1" className="ui-btn-primary">
          {t("newCampaign")}
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("search")}
          className="ui-input min-w-[220px] flex-1"
        />
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={onlyAlerts}
            onChange={(e) => setOnlyAlerts(e.target.checked)}
            className="accent-violet-600"
          />
          {t("onlyAlerts")}
        </label>
        <button type="button" onClick={load} className="ui-btn-secondary">
          {t("refresh")}
        </button>
      </div>

      <div className="ui-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">{t("colCampaign")}</th>
                <th className="px-3 py-3">{t("colClient")}</th>
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
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    {t("loading")}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    {t("empty")}
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.metaCampaignId} className="border-t border-slate-100 hover:bg-violet-50/40">
                    <td className="px-4 py-3">
                      <Link
                        href={`/campaigns/${r.metaCampaignId}?client=${encodeURIComponent(r.clientSlug)}`}
                        onClick={() => rememberCampaign(r.metaCampaignId, r.clientSlug)}
                        className="font-medium text-slate-900 hover:text-violet-600"
                      >
                        {r.campaignName}
                      </Link>
                      <div className="text-[10px] text-slate-400">{r.metaCampaignId}</div>
                    </td>
                    <td className="px-3 py-3">{r.clientName}</td>
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
    </div>
  );
}
