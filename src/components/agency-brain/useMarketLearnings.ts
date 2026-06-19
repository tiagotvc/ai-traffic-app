"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import type { FeedbackMessage } from "@/components/agency-brain/FeedbackBanner";
import { useAgencyBrainAi } from "@/components/agency-brain/AgencyBrainAiContext";
import type { MarketInsightDto } from "@/lib/agency-brain/market-learnings-service";
import type { MarketCoverageLevel } from "@/lib/meta-ad-library/types";

function applyMarketPayload(
  data: Record<string, unknown>,
  setters: {
    setItems: (v: MarketInsightDto[]) => void;
    setNiche: (v: string | null) => void;
    setAggregated: (v: boolean) => void;
    setClientName: (v: string) => void;
    setCoverageLevel: (v: MarketCoverageLevel) => void;
    setAdsAnalyzed: (v: number) => void;
    setCompetitorsScanned: (v: number) => void;
    setApiConfigured: (v: boolean) => void;
    setScannedAt: (v: string | null) => void;
    setHasScan: (v: boolean) => void;
  }
) {
  setters.setItems((data.items as MarketInsightDto[]) ?? []);
  setters.setNiche((data.niche as string | null) ?? null);
  setters.setAggregated(Boolean(data.aggregated));
  setters.setClientName((data.clientName as string) ?? "");
  setters.setCoverageLevel((data.coverageLevel as MarketCoverageLevel) ?? "empty");
  setters.setAdsAnalyzed(Number(data.adsAnalyzed ?? 0));
  setters.setCompetitorsScanned(Number(data.competitorsScanned ?? 0));
  setters.setApiConfigured(data.apiConfigured !== false);
  setters.setScannedAt((data.scannedAt as string | null) ?? null);
  setters.setHasScan(Boolean(data.hasScan));
}

export function useMarketLearnings(clientId: string, enabled: boolean) {
  const t = useTranslations("agencyBrain");
  const { aiDisabled, refresh: refreshAiStatus } = useAgencyBrainAi();

  const [items, setItems] = useState<MarketInsightDto[]>([]);
  const [niche, setNiche] = useState<string | null>(null);
  const [aggregated, setAggregated] = useState(false);
  const [clientName, setClientName] = useState("");
  const [coverageLevel, setCoverageLevel] = useState<MarketCoverageLevel>("empty");
  const [adsAnalyzed, setAdsAnalyzed] = useState(0);
  const [competitorsScanned, setCompetitorsScanned] = useState(0);
  const [apiConfigured, setApiConfigured] = useState(true);
  const [scannedAt, setScannedAt] = useState<string | null>(null);
  const [hasScan, setHasScan] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const [message, setMessage] = useState<FeedbackMessage | null>(null);

  const setters = {
    setItems,
    setNiche,
    setAggregated,
    setClientName,
    setCoverageLevel,
    setAdsAnalyzed,
    setCompetitorsScanned,
    setApiConfigured,
    setScannedAt,
    setHasScan
  };

  const load = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/agency-brain/market-learnings?client=${encodeURIComponent(clientId)}`
      );
      const data = await res.json();
      if (data.ok) applyMarketPayload(data, setters);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (!enabled || !clientId) return;
    void load();
  }, [enabled, clientId, load]);

  const handleScan = useCallback(async () => {
    if (!clientId || scanning) return;
    setScanning(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/agency-brain/market-learnings?client=${encodeURIComponent(clientId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "scan" })
        }
      );
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setMessage({ type: "err", text: data.error ?? t("marketInsightScanError") });
        return;
      }

      applyMarketPayload(data, setters);

      if (data.adsAnalyzed > 0) {
        setMessage({ type: "ok", text: t("marketInsightScanSuccess", { count: data.adsAnalyzed }) });
      } else if (data.apiError) {
        setMessage({ type: "warn", text: data.apiError });
      } else {
        setMessage({ type: "warn", text: t("marketCoverageEmpty", { count: 0 }) });
      }
    } catch {
      setMessage({ type: "err", text: t("marketInsightScanError") });
    } finally {
      setScanning(false);
    }
  }, [clientId, scanning, t]);

  const handleSynthesize = useCallback(async () => {
    if (!clientId || synthesizing || aiDisabled) return;
    setSynthesizing(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/agency-brain/market-learnings?client=${encodeURIComponent(clientId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "synthesize" })
        }
      );
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setMessage({ type: "err", text: data.error ?? t("marketInsightAiError") });
        return;
      }

      applyMarketPayload(data, setters);

      const generated = data.aiGenerated ?? 0;
      if (generated > 0) {
        setMessage({ type: "ok", text: t("marketInsightAiSuccess", { count: generated }) });
      } else {
        setMessage({ type: "warn", text: t("marketInsightAiNoResults") });
      }

      await refreshAiStatus();
    } catch {
      setMessage({ type: "err", text: t("marketInsightAiError") });
    } finally {
      setSynthesizing(false);
    }
  }, [clientId, synthesizing, aiDisabled, t, refreshAiStatus]);

  return {
    items,
    niche,
    aggregated,
    clientName,
    coverageLevel,
    adsAnalyzed,
    competitorsScanned,
    apiConfigured,
    scannedAt,
    hasScan,
    loading,
    scanning,
    synthesizing,
    aiDisabled,
    message,
    setMessage,
    reload: load,
    handleScan,
    handleSynthesize
  };
}
