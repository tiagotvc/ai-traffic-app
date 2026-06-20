"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { CampaignAdSetsClient } from "@/components/CampaignAdSetsClient";
import { rememberCampaign } from "@/components/CampaignsListClient";
import { Skeleton } from "@/components/ui/Skeleton";
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
      <aside className="w-full shrink-0 border-b border-[var(--border-color)] bg-[var(--surface-card)] lg:w-[260px] lg:border-b-0 lg:border-r">
        <div className="border-b border-[var(--border-color)] p-4">
          <h1 className="font-heading text-lg font-bold text-[var(--text-main)]">{t("hubTitle")}</h1>
          <p className="text-xs text-[var(--text-dim)]">{t("hubSubtitle")}</p>
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
            <div className="space-y-2 p-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="space-y-2 p-3 text-center text-xs text-[var(--text-dim)]">
              <p>{t("noCampaigns")}</p>
              <Link href="/campaigns" className="text-[var(--violet)] hover:underline">
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
                    ? "border-violet-400 bg-[rgba(124,58,237,0.06)]"
                    : "border-[var(--border-color)] hover:bg-[var(--surface-bg)]"
                }`}
              >
                <div className="font-semibold text-[var(--text-main)]">{r.campaignName}</div>
                <div className="text-[11px] text-[var(--text-dim)]">{r.clientName}</div>
                <div className="mt-1 flex justify-between text-[10px] text-[var(--text-dimmer)]">
                  <span>{formatBRL(r.spend)}</span>
                  <span>ROAS {formatRoas(r.roas)}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto bg-[var(--surface-bg)]/50 p-4 lg:p-6">
        {selectedId ? (
          <CampaignAdSetsClient
            metaCampaignId={selectedId}
            clientSlug={selectedSlug}
            embedded
          />
        ) : (
          <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--surface-card)] p-8 text-center">
            <div>
              <p className="font-semibold text-[var(--text-main)]">{t("pickCampaign")}</p>
              <p className="mt-2 text-sm text-[var(--text-dim)]">{t("pickCampaignHint")}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
