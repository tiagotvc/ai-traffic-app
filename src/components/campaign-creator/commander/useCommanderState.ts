"use client";

import { useEffect, useMemo, useState } from "react";

import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";
import { useCommanderScientistsAccess } from "@/hooks/useCommanderScientistsAccess";
import { commanderService } from "@/lib/commander/commander-service";
import type { CommanderInsight, CommanderPipelineStep, CommanderState } from "@/lib/commander/types";
import type { PipelineEvent, ResearchDossier } from "@/lib/labs/pipelines/types";

type LiveScientist = {
  id: string;
  label: string;
  status: "running" | "done" | "skipped";
  findings: number;
};

export function useCommanderState(surface: "desktop" | "mobile" = "desktop") {
  const { payload, activeNode, draftId } = useCampaignDraft();
  const researchEnabled = useCommanderScientistsAccess("campaigns.commander.scientists.campaigns");
  const [localState, setLocalState] = useState<CommanderState>(() =>
    commanderService.analyzeCampaignDraft(payload)
  );
  const [localAnalyzing, setLocalAnalyzing] = useState(false);
  const [researching, setResearching] = useState(false);
  const [scientists, setScientists] = useState<LiveScientist[]>([]);
  const [dossier, setDossier] = useState<ResearchDossier | null>(null);
  const [surfaceActive, setSurfaceActive] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => setSurfaceActive(surface === "desktop" ? query.matches : !query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [surface]);

  useEffect(() => {
    setLocalAnalyzing(true);
    const timer = window.setTimeout(() => {
      setLocalState(commanderService.analyzeCampaignDraft(payload));
      setLocalAnalyzing(false);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [
    payload.clientSlug,
    payload.adAccountId,
    payload.objective,
    payload.campaign.name,
    payload.campaign.dailyBudgetBRL,
    payload.activeAdsetId,
    payload.activeAdId,
    payload.adsets,
    payload.ads
  ]);

  useEffect(() => {
    if (!surfaceActive || !researchEnabled || !payload.clientSlug) {
      setResearching(false);
      setScientists([]);
      setDossier(null);
      return;
    }

    const controller = new AbortController();
    setResearching(true);
    setScientists([]);

    const upsert = (next: LiveScientist) => {
      setScientists((current) => {
        const index = current.findIndex((item) => item.id === next.id);
        if (index < 0) return [...current, next];
        const copy = [...current];
        copy[index] = { ...copy[index], ...next };
        return copy;
      });
    };

    const handle = (event: PipelineEvent) => {
      if (event.phase === "scientist_start") {
        upsert({
          id: event.scientistId,
          label: event.label,
          status: "running",
          findings: 0
        });
      } else if (event.phase === "scientist_done") {
        upsert({
          id: event.scientistId,
          label: event.label,
          status: event.ran ? "done" : "skipped",
          findings: event.findings
        });
      } else if (event.phase === "done") {
        setDossier(event.dossier);
        setResearching(false);
      }
    };

    void (async () => {
      try {
        const response = await fetch("/api/labs/pipeline/stream", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            scope: "campaign",
            clientSlug: payload.clientSlug,
            briefing: payload.objective,
            activeNode,
            draftId: draftId ?? undefined,
            persistHypotheses: activeNode === "review"
          }),
          signal: controller.signal
        });
        if (!response.ok || !response.body) {
          setResearching(false);
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() ?? "";
          for (const chunk of chunks) {
            const line = chunk.trim();
            if (!line.startsWith("data:")) continue;
            try {
              handle(JSON.parse(line.slice(5).trim()) as PipelineEvent);
            } catch {
              // Ignore an incomplete SSE event; the next chunk continues the stream.
            }
          }
        }
      } catch {
        if (!controller.signal.aborted) setResearching(false);
      }
    })();

    return () => controller.abort();
  }, [surfaceActive, researchEnabled, payload.clientSlug, payload.objective, activeNode, draftId]);

  const researchInsights = useMemo<CommanderInsight[]>(() => {
    if (!dossier) return [];
    const sectionByTitle = dossier.sections.flatMap((section) =>
      section.findings.map((finding) => ({ section, finding }))
    );

    return dossier.suggestions.slice(0, 4).map((suggestion, index) => {
      const evidence = sectionByTitle.find(({ finding }) => finding.title === suggestion.title);
      return {
        id: `research-${index}-${suggestion.title}`,
        type: suggestion.priority === "high" ? "recommendation" : "opportunity",
        title: suggestion.title,
        description: suggestion.body,
        impact: suggestion.priority ?? "medium",
        confidence: evidence?.section.confidence ?? dossier.confidence ?? null,
        source: evidence?.section.label ?? "Commander",
        evidence: evidence?.finding.evidence,
        sources: evidence?.section.sources ?? []
      };
    });
  }, [dossier]);

  const state = useMemo<CommanderState>(() => {
    if (!researchEnabled || scientists.length === 0) {
      return {
        ...localState,
        status: localAnalyzing ? "analyzing" : localState.status,
        confidence: null,
        activeScientist: undefined,
        insights: [],
        insightsCount: 0,
        pipeline: [
          { ...localState.pipeline[0]!, status: "done" },
          {
            key: "engine",
            label: "Recommendation Engine",
            description: "Aguardando dados reais dos Scientists.",
            status: "pending"
          }
        ]
      };
    }

    const researchPipeline: CommanderPipelineStep[] = scientists
      .filter((scientist) => scientist.status !== "skipped")
      .map((scientist) => ({
      key: `scientist-${scientist.id}`,
      label: scientist.label,
      description:
        scientist.status === "running"
          ? "Pesquisando fontes disponíveis…"
          : scientist.status === "done"
            ? `${scientist.findings} achado(s) consolidado(s).`
            : "Nenhum achado retornado.",
      status:
        scientist.status === "running"
          ? "running"
          : scientist.status === "done"
            ? "done"
            : "pending"
      }));
    const pipeline: CommanderPipelineStep[] = [
      { ...localState.pipeline[0]!, status: "done" },
      ...researchPipeline,
      {
        key: "engine",
        label: "Recommendation Engine",
        description: dossier ? "Estratégia consolidada com evidências." : "Aguardando os Scientists.",
        status: dossier ? "done" : "pending"
      }
    ];

    return {
      ...localState,
      status: researching ? "analyzing" : dossier ? "complete" : localState.status,
      confidence: dossier?.confidence ?? null,
      activeScientist: scientists.find((item) => item.status === "running")?.label,
      insights: researchInsights,
      insightsCount: researchInsights.length,
      pipeline
    };
  }, [
    dossier,
    localAnalyzing,
    localState,
    researchEnabled,
    researching,
    researchInsights,
    scientists
  ]);

  return {
    state,
    analyzing: localAnalyzing || researching,
    researchEnabled,
    researchMode: researchEnabled && Boolean(payload.clientSlug) ? "scientists" as const : "draft" as const,
    activeScientists: scientists.filter((scientist) => scientist.status !== "skipped")
  };
}
