"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useCommandStripOptional } from "@/components/layout/CommandStripContext";
import { type PeriodState, periodStateToQuery } from "@/components/PeriodFilter";
import type { MetricKey } from "@/lib/dashboard-metrics";
import type { CreativeAccessWarning } from "@/lib/creatives-access-types";
import type { CreativeItem } from "@/components/creatives/CreativeCardGrid";

type ClientRow = { id: string; slug: string; name: string };
type AccountOpt = { metaAdAccountId: string; label: string };

type RankGroup = {
  preset: string;
  primaryMetric: MetricKey;
  best: CreativeItem[];
  promising: CreativeItem[];
  noSpend: CreativeItem[];
};

const EMPTY_PERIOD: PeriodState = { preset: "last30", since: "", until: "" };

export function useCreativesData() {
  const strip = useCommandStripOptional();
  const setAdAccountsRef = useRef(strip?.setAdAccounts);
  setAdAccountsRef.current = strip?.setAdAccounts;

  const clientId = strip?.clientFilter ?? "";
  const accountId = strip?.accountFilter ?? "";
  const stripPeriod = strip?.period;
  const period = useMemo(
    () => stripPeriod ?? EMPTY_PERIOD,
    [stripPeriod?.preset, stripPeriod?.since, stripPeriod?.until]
  );

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [accounts, setAccounts] = useState<AccountOpt[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [groups, setGroups] = useState<RankGroup[]>([]);
  const [warnings, setWarnings] = useState<CreativeAccessWarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [rankVersion, setRankVersion] = useState(0);

  const periodQuery = useMemo(() => {
    const qs = periodStateToQuery(period).toString();
    return `${qs}${accountId ? `&adAccountId=${encodeURIComponent(accountId)}` : ""}${rankVersion > 0 ? "&refresh=1" : ""}`;
  }, [period, accountId, rankVersion]);

  useEffect(() => {
    fetch("/api/clients?minimal=1")
      .then((r) => r.json())
      .then((j) => {
        setClients((j.clients ?? []) as ClientRow[]);
      })
      .catch(() => {})
      .finally(() => setClientsLoading(false));
  }, []);

  useEffect(() => {
    if (!clientId) {
      setAccounts([]);
      setAdAccountsRef.current?.([]);
      return;
    }
    setAccountsLoading(true);
    fetch(`/api/meta/ad-accounts?clientId=${encodeURIComponent(clientId)}`)
      .then((r) => r.json())
      .then((j) => {
        const list = (j.accounts ?? []) as AccountOpt[];
        setAccounts(list);
        setAdAccountsRef.current?.(
          list.map((a) => ({ id: a.metaAdAccountId, label: a.label }))
        );
      })
      .catch(() => {
        setAccounts([]);
        setAdAccountsRef.current?.([]);
      })
      .finally(() => setAccountsLoading(false));
  }, [clientId]);

  const loadRanking = useCallback(() => {
    if (!clientId || accountsLoading) {
      if (!clientId) setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    fetch(`/api/creatives/performance?clientId=${encodeURIComponent(clientId)}&${periodQuery}`)
      .then(async (r) => {
        const text = await r.text();
        let j: Record<string, unknown> = {};
        try {
          j = JSON.parse(text) as Record<string, unknown>;
        } catch {
          if (!r.ok) throw new Error("load");
        }
        if (!r.ok) throw new Error((j.error as string) || "load");
        if (j.ok) {
          setGroups((j.groups as RankGroup[]) ?? []);
          setWarnings((j.warnings as CreativeAccessWarning[]) ?? []);
        }
      })
      .catch(() => setLoadError("load"))
      .finally(() => setLoading(false));
  }, [clientId, periodQuery, accountsLoading]);

  useEffect(() => {
    loadRanking();
  }, [loadRanking]);

  useEffect(() => {
    const onSync = () => setRankVersion((v) => v + 1);
    window.addEventListener("traffic-sync-done", onSync);
    return () => window.removeEventListener("traffic-sync-done", onSync);
  }, []);

  const refresh = useCallback(() => setRankVersion((v) => v + 1), []);

  return {
    clients,
    clientsLoading,
    clientId,
    accounts,
    accountsLoading,
    accountId,
    period,
    groups,
    warnings,
    loading,
    loadError,
    configOpen,
    setConfigOpen,
    refresh,
    onConfigSaved: () => setRankVersion((v) => v + 1)
  };
}
