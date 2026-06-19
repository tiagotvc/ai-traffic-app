"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";

import type { FeedbackMessage } from "@/components/agency-brain/FeedbackBanner";
import { parseAiAnalysisResponse } from "@/components/agency-brain/handleAiAnalysisResponse";
import { useAgencyBrainAi } from "@/components/agency-brain/AgencyBrainAiContext";
import { logRefineRun } from "@/lib/agency-brain/insights/research-log-repository";

/** IA credits consumed: campaign analysis + market synthesis. */
export const REFINE_RESEARCH_AI_POINTS = 2;

export function useRefineResearch(clientId: string, onComplete?: () => void) {
  const t = useTranslations("brainInsights");
  const tBrain = useTranslations("agencyBrain");
  const { aiDisabled, refresh: refreshAiStatus } = useAgencyBrainAi();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<FeedbackMessage | null>(null);

  const refine = useCallback(async () => {
    if (!clientId || loading) return;
    if (aiDisabled) {
      setMessage({ type: "warn", text: t("refineNoPoints") });
      return;
    }

    setLoading(true);
    setMessage(null);

    let adsAnalyzed = 0;
    let patternsCreated = 0;
    let aiLearningsCreated = 0;
    let marketInsights = 0;
    let scanJson: Record<string, unknown> | undefined;
    let detectJson: Record<string, unknown> | undefined;
    let aiJson: Record<string, unknown> | undefined;
    let synthJson: Record<string, unknown> | undefined;

    try {
      const scanRes = await fetch(
        `/api/agency-brain/market-learnings?client=${encodeURIComponent(clientId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "scan" })
        }
      );
      scanJson = await scanRes.json();
      if (scanRes.ok && scanJson.ok) {
        adsAnalyzed = Number(scanJson.adsAnalyzed ?? 0);
      }

      const detectRes = await fetch(
        `/api/clients/${encodeURIComponent(clientId)}/learnings/suggest`,
        { method: "POST" }
      );
      detectJson = await detectRes.json();
      if (detectRes.ok && detectJson.ok) {
        patternsCreated = Number(detectJson.created ?? 0);
      }

      const aiRes = await fetch(
        `/api/clients/${encodeURIComponent(clientId)}/learnings/ai-suggest`,
        { method: "POST" }
      );
      aiJson = await aiRes.json();
      const aiParsed = parseAiAnalysisResponse(aiRes, aiJson, {
        aiLimit: tBrain("aiLimit"),
        aiNoKey: tBrain("aiNoKey"),
        aiRateLimit: tBrain("aiRateLimit"),
        aiServiceError: tBrain("aiServiceError"),
        aiParseError: tBrain("aiParseError"),
        aiSchemaError: tBrain("aiSchemaError"),
        aiNoResults: tBrain("aiNoResults"),
        aiNoMetrics: tBrain("aiNoMetrics"),
        aiGenericError: tBrain("aiErrorLearnings"),
        aiSuccess: (count) => tBrain("aiSuccessLearnings", { count })
      });

      if (aiParsed?.message.type === "err") {
        logRefineRun(clientId, {
          adsAnalyzed,
          patternsCreated,
          aiLearningsCreated: 0,
          marketInsights: 0,
          status: "error",
          scanJson,
          detectJson,
          aiJson
        });
        setMessage(aiParsed.message);
        await refreshAiStatus();
        onComplete?.();
        return;
      }

      if (aiJson.ok) {
        aiLearningsCreated = Number(aiJson.created ?? 0);
      }

      if (adsAnalyzed > 0) {
        const synthRes = await fetch(
          `/api/agency-brain/market-learnings?client=${encodeURIComponent(clientId)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "synthesize" })
          }
        );
        synthJson = await synthRes.json();
        if (synthRes.ok && synthJson.ok) {
          marketInsights = Number(synthJson.aiGenerated ?? 0);
        } else if (!synthRes.ok || !synthJson.ok) {
          logRefineRun(clientId, {
            adsAnalyzed,
            patternsCreated,
            aiLearningsCreated,
            marketInsights: 0,
            status: "warning",
            scanJson,
            detectJson,
            aiJson,
            synthJson
          });
          setMessage({
            type: "warn",
            text: synthJson.error ?? tBrain("marketInsightAiError")
          });
          await refreshAiStatus();
          onComplete?.();
          return;
        }
      }

      await refreshAiStatus();

      const total =
        adsAnalyzed + patternsCreated + aiLearningsCreated + marketInsights;
      const status = total > 0 ? "success" : "warning";

      logRefineRun(clientId, {
        adsAnalyzed,
        patternsCreated,
        aiLearningsCreated,
        marketInsights,
        status,
        scanJson,
        detectJson,
        aiJson,
        synthJson
      });

      if (total > 0) {
        setMessage({
          type: "ok",
          text: t("refineSuccess", {
            ads: adsAnalyzed,
            patterns: patternsCreated,
            learnings: aiLearningsCreated,
            market: marketInsights
          })
        });
      } else {
        setMessage({ type: "warn", text: t("refineNoResults") });
      }
      onComplete?.();
    } catch {
      logRefineRun(clientId, {
        adsAnalyzed: 0,
        patternsCreated: 0,
        aiLearningsCreated: 0,
        marketInsights: 0,
        status: "error",
        scanJson,
        detectJson,
        aiJson,
        synthJson
      });
      setMessage({ type: "err", text: t("refineError") });
      onComplete?.();
    } finally {
      setLoading(false);
    }
  }, [aiDisabled, clientId, loading, onComplete, refreshAiStatus, t, tBrain]);

  return {
    refine,
    loading,
    message,
    setMessage,
    aiDisabled,
    pointsCost: REFINE_RESEARCH_AI_POINTS
  };
}
