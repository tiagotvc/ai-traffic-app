"use client";

import { useTranslations } from "next-intl";
import { Building2, BarChart2 } from "lucide-react";
import { useEffect, useState } from "react";

import { DsPageHeader } from "@/design-system";
import { CreativesLibraryView } from "@/components/creatives/CreativesLibraryView";
import { CreativesRankingView } from "@/components/creatives/CreativesRankingView";
import { RankingConfigModal } from "@/components/creatives/RankingConfigModal";
import { FilterSelectDropdown } from "@/components/FilterSelectDropdown";
import { PeriodFilter, periodStateToQuery, type PeriodState } from "@/components/PeriodFilter";
import { DownloadIcon } from "@/components/ui/DownloadIcon";
import { SettingsOutlineIcon } from "@/components/ui/OutlineIcon";
import { TableSkeleton } from "@/components/ui/Skeleton";

type ClientRow = { id: string; slug: string; name: string };
type AccountOpt = { metaAdAccountId: string; label: string };

export function CreativesLibraryClient() {
  const t = useTranslations("creatives");
  const tPerf = useTranslations("creativesPerf");
  const tDash = useTranslations("dashboard");
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientId, setClientId] = useState("");
  const [accounts, setAccounts] = useState<AccountOpt[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [view, setView] = useState<"library" | "byCampaign">("byCampaign");
  const [period, setPeriod] = useState<PeriodState>({ preset: "last30", since: "", until: "" });
  const [configOpen, setConfigOpen] = useState(false);
  const [rankVersion, setRankVersion] = useState(0);
  const periodQuery = periodStateToQuery(period).toString();
  const scopeQuery = `${periodQuery}${accountId ? `&adAccountId=${encodeURIComponent(accountId)}` : ""}${rankVersion > 0 ? "&refresh=1" : ""}`;

  useEffect(() => {
    if (!clientId) {
      setAccounts([]);
      setAccountsLoading(false);
      return;
    }
    setAccountId("");
    setAccountsLoading(true);
    fetch(`/api/meta/ad-accounts?clientId=${encodeURIComponent(clientId)}`)
      .then((r) => r.json())
      .then((j) => setAccounts(j.accounts ?? []))
      .catch(() => setAccounts([]))
      .finally(() => setAccountsLoading(false));
  }, [clientId]);

  useEffect(() => {
    fetch("/api/clients?minimal=1")
      .then((r) => r.json())
      .then((j) => {
        const list = (j.clients ?? []) as ClientRow[];
        setClients(list);
        setClientId(
          (prev) => prev || list.find((c) => c.slug !== "default")?.slug || list[0]?.slug || ""
        );
      })
      .catch(() => {})
      .finally(() => setClientsLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <DsPageHeader
        breadcrumbs={t("breadcrumb")}
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <PeriodFilter value={period} onChange={setPeriod} />
            <FilterSelectDropdown
              icon={<Building2 size={14} />}
              label={t("filterClient")}
              placeholder={t("filterClient")}
              value={clientId}
              onChange={setClientId}
              clearable={false}
              options={clients.map((c) => ({ value: c.slug, label: c.name }))}
            />
            {accounts.length > 1 ? (
              <FilterSelectDropdown
                icon={<BarChart2 size={14} />}
                label={tDash("filterAccount")}
                placeholder={tPerf("allAccounts")}
                value={accountId}
                onChange={setAccountId}
                options={accounts.map((a) => ({ value: a.metaAdAccountId, label: a.label }))}
              />
            ) : null}
          <button
            type="button"
            onClick={() => setRankVersion((v) => v + 1)}
            className="ui-btn-secondary px-2.5 text-sm"
            title={tPerf("refresh")}
            aria-label={tPerf("refresh")}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992V4.356M3.985 14.652H-.008m.001 0v4.992m0-4.992 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.183m0-4.992v4.992m0 0h-4.993" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setConfigOpen(true)}
            className="ui-btn-secondary inline-flex items-center gap-1.5 text-sm"
          >
            <SettingsOutlineIcon className="h-4 w-4" />
            {tPerf("cfgButton")}
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
        }
      />

      {clientsLoading ? (
        <div className="space-y-3">
          <p className="text-center text-sm text-[var(--text-dim)]">{tPerf("loading")}</p>
          <TableSkeleton rows={5} columns={["media", "metric", "metric", "metric"]} />
        </div>
      ) : clientId ? (
        view === "library" ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setView("byCampaign")}
              className="ui-link print:hidden"
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
            <CreativesRankingView
              key={`${clientId}-${scopeQuery}-${rankVersion}`}
              clientId={clientId}
              clientSlug={clientId}
              periodQuery={scopeQuery}
              accounts={accounts}
              accountsLoading={accountsLoading}
            />
            <div className="flex justify-center print:hidden">
              <button
                type="button"
                onClick={() => setView("library")}
                className="ui-link"
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
