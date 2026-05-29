"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { CampaignManagerClient } from "@/components/CampaignManagerClient";
import { rememberCampaign } from "@/components/CampaignsListClient";
import { usePublishPanel } from "@/components/publish/PublishPanelContext";
import { Link } from "@/i18n/navigation";

type CampaignRow = {
  metaCampaignId: string;
  campaignName: string;
  clientName: string;
  clientSlug: string;
};

const LAST_CAMPAIGN_KEY = "traffic-ai-last-campaign";

export function CampaignsHubClient() {
  const t = useTranslations("campaignsPage");
  const { openPanel } = usePublishPanel();
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSlug, setSelectedSlug] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/campaigns/list")
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
  }, []);

  useEffect(() => {
    load();
    const onReload = () => load();
    window.addEventListener("traffic:campaigns-reload", onReload);
    return () => window.removeEventListener("traffic:campaigns-reload", onReload);
  }, [load]);

  const onCampaignChange = (id: string) => {
    const row = rows.find((r) => r.metaCampaignId === id);
    if (!row) return;
    setSelectedId(row.metaCampaignId);
    setSelectedSlug(row.clientSlug);
    rememberCampaign(row.metaCampaignId, row.clientSlug);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          {rows.length > 0 ? (
            <select
              value={selectedId ?? ""}
              onChange={(e) => onCampaignChange(e.target.value)}
              className="ui-select max-w-xl text-sm font-semibold"
            >
              {rows.map((r) => (
                <option key={r.metaCampaignId} value={r.metaCampaignId}>
                  {r.campaignName} — {r.clientName}
                </option>
              ))}
            </select>
          ) : (
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
              <p className="mt-1 text-sm text-slate-500">{t("emptyExplain")}</p>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={load} className="ui-btn-secondary text-sm">
            {t("refresh")}
          </button>
          <button
            type="button"
            onClick={() => openPanel({ clientSlug: selectedSlug || undefined })}
            className="ui-btn-primary text-sm"
          >
            {t("newCampaign")}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">{t("loading")}</p>
      ) : selectedId ? (
        <CampaignManagerClient
          metaCampaignId={selectedId}
          clientSlug={selectedSlug}
          tab="overview"
          embedded
        />
      ) : (
        <div className="ui-card space-y-4 p-8 text-center">
          <p className="text-lg font-semibold text-slate-800">{t("emptyTitle")}</p>
          <p className="mx-auto max-w-lg text-sm text-slate-500">{t("emptyExplain")}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => openPanel()}
              className="ui-btn-primary"
            >
              {t("createFirst")}
            </button>
            <button
              type="button"
              onClick={() => fetch("/api/sync/run", { method: "POST" }).then(load)}
              className="ui-btn-secondary"
            >
              {t("syncNow")}
            </button>
            <Link href="/settings" className="ui-btn-secondary">
              {t("connectHint")}
            </Link>
          </div>
          <p className="text-xs text-slate-400">{t("hierarchyNote")}</p>
        </div>
      )}
    </div>
  );
}
