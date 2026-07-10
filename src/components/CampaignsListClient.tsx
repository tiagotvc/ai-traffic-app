"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CampaignCreationModePicker } from "@/components/campaign-creator/CampaignCreationModePicker";
import { Badge } from "@/components/ui/Badge";
import { DsPageHeader } from "@/design-system";
import { Link } from "@/i18n/navigation";
import { formatBRL, formatRoas } from "@/lib/format";

type CampaignRow = {
  platform?: "meta" | "google";
  metaCampaignId: string;
  campaignName: string;
  clientName: string;
  clientSlug: string;
  accountLabel: string;
  spend: number;
  conversions: number;
  cpa: number | null;
  roas: number;
  alertCount?: number;
  hasAlert?: boolean;
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
  const [creationPickerOpen, setCreationPickerOpen] = useState(false);
  const [platform, setPlatform] = useState<"meta" | "google" | "both">("meta");
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    // Seletor de plataforma só aparece com Google Ads ligado (rota 404 quando off).
    fetch("/api/settings/google")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.ok) setGoogleEnabled(true);
      })
      .catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    const wantMeta = platform !== "google";
    // Google não tem alerta por campanha — com onlyAlerts, mostra só Meta.
    const wantGoogle = platform !== "meta" && googleEnabled && !onlyAlerts;

    const metaParams = new URLSearchParams(params);
    if (onlyAlerts) metaParams.set("onlyAlerts", "1");

    const metaP: Promise<CampaignRow[]> = wantMeta
      ? fetch(`/api/command-center/campaigns?${metaParams}`)
          .then((r) => r.json())
          .then((j) => (j.rows ?? []) as CampaignRow[])
      : Promise.resolve([]);
    const googleP: Promise<CampaignRow[]> = wantGoogle
      ? fetch(`/api/command-center/google-campaigns?${params}`)
          .then((r) => (r.ok ? r.json() : { rows: [] }))
          .then((j) =>
            ((j.rows ?? []) as Array<CampaignRow & { campaignId: string }>).map((r) => ({
              ...r,
              metaCampaignId: r.campaignId
            }))
          )
      : Promise.resolve([]);

    Promise.all([metaP, googleP])
      .then(([m, g]) => setRows([...m, ...g]))
      .finally(() => setLoading(false));
  }, [q, onlyAlerts, platform, googleEnabled]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => rows, [rows]);

  const totals = useMemo(() => {
    const spend = filtered.reduce((s, r) => s + r.spend, 0);
    const conversions = filtered.reduce((s, r) => s + r.conversions, 0);
    return {
      spend,
      conversions,
      cpa: conversions > 0 ? spend / conversions : null,
      roas:
        filtered.length > 0
          ? filtered.reduce((s, r) => s + r.roas * r.spend, 0) / (spend || 1)
          : 0
    };
  }, [filtered]);

  return (
    <div className="space-y-5">
      <DsPageHeader
        breadcrumbs={t("breadcrumb")}
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <button
            type="button"
            className="ui-btn-primary"
            onClick={() => setCreationPickerOpen(true)}
          >
            {t("newCampaign")}
          </button>
        }
      />

      {googleEnabled ? (
        <div className="flex items-center gap-1.5">
          {(["meta", "google", "both"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlatform(p)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                platform === p
                  ? "border-transparent bg-[var(--ui-accent)] text-white"
                  : "border-[var(--border-color)] text-[var(--text-dim)]"
              }`}
            >
              {t(`platform_${p}` as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("search")}
          className="ui-input min-w-[220px] flex-1"
        />
        <label className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-dim)]">
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
            <thead className="bg-[var(--surface-thead)] text-xs font-semibold uppercase text-[var(--text-dim)]">
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
                  <td colSpan={8} className="px-4 py-8 text-center text-[var(--text-dim)]">
                    {t("loading")}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[var(--text-dim)]">
                    {t("empty")}
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr
                    key={`${r.platform ?? "meta"}:${r.metaCampaignId}`}
                    className="border-t border-[var(--border-color)] hover:bg-[var(--row-hover)]"
                  >
                    <td className="px-4 py-3">
                      {r.platform === "google" ? (
                        <Link
                          href={`/clients/${encodeURIComponent(r.clientSlug)}`}
                          className="ui-link font-medium"
                        >
                          {r.campaignName}
                        </Link>
                      ) : (
                        <Link
                          href={`/campaigns/${r.metaCampaignId}?client=${encodeURIComponent(r.clientSlug)}`}
                          onClick={() => rememberCampaign(r.metaCampaignId, r.clientSlug)}
                          className="ui-link font-medium"
                        >
                          {r.campaignName}
                        </Link>
                      )}
                      <div className="text-[10px] text-[var(--text-dimmer)]">{r.metaCampaignId}</div>
                    </td>
                    <td className="px-3 py-3">{r.clientName}</td>
                    <td className="px-3 py-3 text-[var(--text-dim)]">{r.accountLabel}</td>
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
                        <span className="text-[var(--text-dimmer)]">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && filtered.length > 0 ? (
              <tfoot className="border-t-2 border-[var(--border-color)] bg-[var(--surface-thead)]">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-left font-semibold text-[var(--text-main)]">
                    {t("rowTotal")} ({filtered.length})
                  </td>
                  <td className="px-3 py-3 text-center font-semibold tabular-nums text-[var(--text-main)]">
                    {formatBRL(totals.spend, locale)}
                  </td>
                  <td className="px-3 py-3 text-center font-semibold tabular-nums">
                    {totals.conversions}
                  </td>
                  <td className="px-3 py-3 text-center font-semibold tabular-nums">
                    {totals.cpa != null ? formatBRL(totals.cpa, locale) : "—"}
                  </td>
                  <td className="px-3 py-3 text-center font-semibold tabular-nums">
                    {formatRoas(totals.roas, locale)}
                  </td>
                  <td className="px-3 py-3 text-center text-[var(--text-dimmer)]">—</td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </div>
      <CampaignCreationModePicker
        open={creationPickerOpen}
        onClose={() => setCreationPickerOpen(false)}
        onStarted={() => setCreationPickerOpen(false)}
      />
    </div>
  );
}
