"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState, useTransition } from "react";

import { Link } from "@/i18n/navigation";
import { formatBRL, formatRoas } from "@/lib/format";

type AdSet = { id: string; name?: string; status?: string; dailyBudget: number | null };
type Ad = { id: string; name?: string; status?: string };

export function CampaignDetailClient({
  clientSlug,
  metaCampaignId
}: {
  clientSlug: string;
  metaCampaignId: string;
}) {
  const t = useTranslations("campaignDetail");
  const locale = useLocale();
  const [campaign, setCampaign] = useState<{
    name: string;
    status: string;
    dailyBudget: number | null;
    kpis: { spend: number; cpl: number | null; cpa: number | null };
  } | null>(null);
  const [adsets, setAdsets] = useState<AdSet[]>([]);
  const [adsByAdset, setAdsByAdset] = useState<Record<string, Ad[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const reload = useCallback(() => {
    fetch(`/api/campaigns/${encodeURIComponent(metaCampaignId)}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.campaign) setCampaign(j.campaign);
      });
    fetch(`/api/campaigns/${encodeURIComponent(metaCampaignId)}/adsets`)
      .then((r) => r.json())
      .then((j) => setAdsets(j.adsets ?? []));
  }, [metaCampaignId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const loadAds = (adsetId: string) => {
    fetch(`/api/adsets/${encodeURIComponent(adsetId)}/ads`)
      .then((r) => r.json())
      .then((j) => setAdsByAdset((p) => ({ ...p, [adsetId]: j.ads ?? [] })));
  };

  const campaignAction = (action: "pause" | "activate") => {
    startTransition(async () => {
      const res = await fetch(`/api/campaigns/${encodeURIComponent(metaCampaignId)}/actions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action })
      });
      const j = await res.json();
      setMessage(j.ok ? t(action === "pause" ? "paused" : "activated") : j.error);
      reload();
    });
  };

  if (!campaign) {
    return <div className="p-8 text-center text-sm text-slate-500">{t("loading")}</div>;
  }

  return (
    <div className="space-y-3">
      <Link href={`/clients/${clientSlug}`} className="text-xs font-medium text-brand hover:underline">
        ← {t("back")}
      </Link>

      <div className="ui-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">{campaign.name}</div>
            <div className="mt-1 text-xs text-slate-500">
              {t("status")}: {campaign.status}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              disabled={isPending}
              onClick={() => campaignAction("pause")}
              className="ui-btn-secondary"
            >
              {t("pause")}
            </button>
            <button
              disabled={isPending}
              onClick={() => campaignAction("activate")}
              className="ui-btn-primary"
            >
              {t("activate")}
            </button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Kpi label={t("spend")} value={formatBRL(campaign.kpis.spend, locale)} />
          <Kpi label="CPL" value={campaign.kpis.cpl != null ? formatBRL(campaign.kpis.cpl, locale) : "—"} />
          <Kpi label="CPA" value={campaign.kpis.cpa != null ? formatBRL(campaign.kpis.cpa, locale) : "—"} />
        </div>
        {message ? <div className="mt-2 text-xs text-slate-500">{message}</div> : null}
      </div>

      <div className="ui-card p-4">
        <div className="text-sm font-semibold">{t("adsets")}</div>
        <div className="mt-3 space-y-2">
          {adsets.map((a) => (
            <div key={a.id} className="rounded-xl border border-surface-line bg-slate-50/50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = expanded === a.id ? null : a.id;
                    setExpanded(next);
                    if (next) loadAds(a.id);
                  }}
                  className="text-left text-sm font-medium text-slate-900 hover:text-brand"
                >
                  {a.name ?? a.id} ({a.status})
                </button>
                <div className="flex gap-2">
                  <button
                    disabled={isPending}
                    onClick={() => {
                      startTransition(async () => {
                        await fetch(`/api/adsets/${encodeURIComponent(a.id)}/actions`, {
                          method: "POST",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({ action: "pause" })
                        });
                        reload();
                      });
                    }}
                    className="ui-btn-secondary px-2 py-1 text-[11px]"
                  >
                    {t("pause")}
                  </button>
                  <button
                    disabled={isPending}
                    onClick={() => {
                      startTransition(async () => {
                        await fetch(`/api/adsets/${encodeURIComponent(a.id)}/actions`, {
                          method: "POST",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({ action: "activate" })
                        });
                        reload();
                      });
                    }}
                    className="ui-btn-primary px-2 py-1 text-[11px]"
                  >
                    {t("activate")}
                  </button>
                </div>
              </div>
              {expanded === a.id && (
                <ul className="mt-2 space-y-1 border-t border-surface-line pt-2 text-xs text-slate-600">
                  {(adsByAdset[a.id] ?? []).map((ad) => (
                    <li key={ad.id} className="flex justify-between">
                      <span>{ad.name ?? ad.id}</span>
                      <span>{ad.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-surface-line bg-slate-50 p-3">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}
