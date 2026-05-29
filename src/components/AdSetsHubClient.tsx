"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { CampaignAdSetsClient } from "@/components/CampaignAdSetsClient";
import { rememberCampaign } from "@/components/CampaignsListClient";
import { formatBRL, formatRoas } from "@/lib/format";
import { Link } from "@/i18n/navigation";

const LAST_CAMPAIGN_KEY = "traffic-ai-last-campaign";

type CampaignRow = {
  metaCampaignId: string;
  campaignName: string;
  clientName: string;
  clientSlug: string;
  spend: number;
  roas: number;
};

export function AdSetsHubClient() {
  const t = useTranslations("adsetsPage");
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSlug, setSelectedSlug] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    fetch(`/api/campaigns/list?${params}`)
      .then((r) => r.json())
      .then((j) => {
        const list = (j.rows ?? []) as CampaignRow[];
        setRows(list);
        if (!list.length) {
          setSelectedId(null);
          return;
        }
        try {
          const raw = sessionStorage.getItem(LAST_CAMPAIGN_KEY);
          if (raw) {
            const { metaCampaignId, clientSlug } = JSON.parse(raw) as {
              metaCampaignId: string;
              clientSlug: string;
            };
            const hit = list.find((r) => r.metaCampaignId === metaCampaignId);
            if (hit) {
              setSelectedId(hit.metaCampaignId);
              setSelectedSlug(hit.clientSlug);
              return;
            }
          }
        } catch {
          /* ignore */
        }
        setSelectedId(list[0].metaCampaignId);
        setSelectedSlug(list[0].clientSlug);
        rememberCampaign(list[0].metaCampaignId, list[0].clientSlug);
      })
      .finally(() => setLoading(false));
  }, [q]);

  useEffect(() => {
    load();
  }, [load]);

  const select = (r: CampaignRow) => {
    setSelectedId(r.metaCampaignId);
    setSelectedSlug(r.clientSlug);
    rememberCampaign(r.metaCampaignId, r.clientSlug);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <aside className="w-full shrink-0 border-b border-slate-200 bg-white lg:w-[260px] lg:border-b-0 lg:border-r">
        <div className="border-b border-slate-100 p-4">
          <h1 className="text-lg font-bold text-slate-900">{t("hubTitle")}</h1>
          <p className="text-xs text-slate-500">{t("hubSubtitle")}</p>
        </div>
        <div className="p-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("searchCampaign")}
            className="ui-input w-full text-sm"
          />
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2 lg:max-h-none lg:flex-1">
          {loading ? (
            <p className="p-4 text-center text-xs text-slate-500">{t("loading")}</p>
          ) : rows.length === 0 ? (
            <div className="space-y-2 p-3 text-center text-xs text-slate-500">
              <p>{t("noCampaigns")}</p>
              <Link href="/campaigns" className="text-violet-600 hover:underline">
                {t("viewAllCampaigns")}
              </Link>
            </div>
          ) : (
            rows.map((r) => (
              <button
                key={r.metaCampaignId}
                type="button"
                onClick={() => select(r)}
                className={`mb-1 w-full rounded-xl border p-3 text-left text-sm ${
                  selectedId === r.metaCampaignId
                    ? "border-violet-400 bg-violet-50"
                    : "border-slate-100 hover:bg-slate-50"
                }`}
              >
                <div className="font-semibold text-slate-900">{r.campaignName}</div>
                <div className="text-[11px] text-slate-500">{r.clientName}</div>
                <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                  <span>{formatBRL(r.spend)}</span>
                  <span>ROAS {formatRoas(r.roas)}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto bg-slate-50/50 p-4 lg:p-6">
        {selectedId ? (
          <CampaignAdSetsClient
            metaCampaignId={selectedId}
            clientSlug={selectedSlug}
            embedded
          />
        ) : (
          <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
            <div>
              <p className="font-semibold text-slate-800">{t("pickCampaign")}</p>
              <p className="mt-2 text-sm text-slate-500">{t("pickCampaignHint")}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
