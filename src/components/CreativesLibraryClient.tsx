"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { CreativesLibraryView } from "@/components/creatives/CreativesLibraryView";
import { CreativesByCampaignView } from "@/components/creatives/CreativesByCampaignView";
import { RankingConfigModal } from "@/components/creatives/RankingConfigModal";
import { PeriodFilter, periodStateToQuery, type PeriodState } from "@/components/PeriodFilter";
import { DownloadIcon } from "@/components/ui/DownloadIcon";

type ClientRow = { id: string; slug: string; name: string };
type AccountOpt = { metaAdAccountId: string; label: string };

export function CreativesLibraryClient() {
  const t = useTranslations("creatives");
  const tPerf = useTranslations("creativesPerf");
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [clientId, setClientId] = useState("");
  const [accounts, setAccounts] = useState<AccountOpt[]>([]);
  const [accountId, setAccountId] = useState("");
  const [view, setView] = useState<"library" | "byCampaign">("byCampaign");
  const [period, setPeriod] = useState<PeriodState>({ preset: "last30", since: "", until: "" });
  const [configOpen, setConfigOpen] = useState(false);
  const [rankVersion, setRankVersion] = useState(0);
  const periodQuery = periodStateToQuery(period).toString();
  const scopeQuery = `${periodQuery}${accountId ? `&adAccountId=${encodeURIComponent(accountId)}` : ""}`;

  useEffect(() => {
    if (!clientId) {
      setAccounts([]);
      return;
    }
    setAccountId("");
    fetch(`/api/meta/ad-accounts?clientId=${encodeURIComponent(clientId)}`)
      .then((r) => r.json())
      .then((j) => setAccounts(j.accounts ?? []))
      .catch(() => setAccounts([]));
  }, [clientId]);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((j) => {
        const list = (j.clients ?? []) as ClientRow[];
        setClients(list);
        setClientId(
          (prev) => prev || list.find((c) => c.slug !== "default")?.slug || list[0]?.slug || ""
        );
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{t("breadcrumb")}</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <PeriodFilter value={period} onChange={setPeriod} />
          <span className="text-xs text-slate-500">{t("clientLabel")}:</span>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="ui-select !w-auto !py-1.5 text-sm"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          {accounts.length > 1 ? (
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="ui-select !w-auto !py-1.5 text-sm"
            >
              <option value="">{tPerf("allAccounts")}</option>
              {accounts.map((a) => (
                <option key={a.metaAdAccountId} value={a.metaAdAccountId}>
                  {a.label}
                </option>
              ))}
            </select>
          ) : null}
          <button
            type="button"
            onClick={() => setConfigOpen(true)}
            className="ui-btn-secondary text-sm"
          >
            ⚙ {tPerf("cfgButton")}
          </button>
          {view === "byCampaign" ? (
            <button
              type="button"
              onClick={() => window.print()}
              className="ui-btn-secondary inline-flex items-center gap-1.5 text-sm"
            >
              <DownloadIcon />
              {tPerf("exportPdf")}
            </button>
          ) : null}
        </div>
      </div>

      {clientId ? (
        view === "library" ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setView("byCampaign")}
              className="text-sm font-medium text-violet-600 hover:underline print:hidden"
            >
              ← {tPerf("backToRanking")}
            </button>
            <CreativesLibraryView
              key={`${clientId}-${scopeQuery}-${rankVersion}`}
              fetchUrl={`/api/creatives/library?clientId=${encodeURIComponent(clientId)}&${scopeQuery}`}
              translationNs="creatives"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <CreativesByCampaignView
              key={`${clientId}-${scopeQuery}-${rankVersion}`}
              clientId={clientId}
              clientSlug={clientId}
              periodQuery={scopeQuery}
            />
            <div className="flex justify-center print:hidden">
              <button
                type="button"
                onClick={() => setView("library")}
                className="text-sm font-medium text-violet-600 hover:underline"
              >
                {tPerf("viewAllCreatives")} →
              </button>
            </div>
          </div>
        )
      ) : null}

      {configOpen ? (
        <RankingConfigModal
          onClose={() => setConfigOpen(false)}
          onSaved={() => setRankVersion((v) => v + 1)}
        />
      ) : null}
    </div>
  );
}
