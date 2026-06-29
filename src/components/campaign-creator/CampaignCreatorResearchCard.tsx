"use client";

import { useEffect, useRef, useState } from "react";

import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";
import { ResearchDossierCard, type LiveStep } from "@/components/labs/ResearchDossierCard";
import { resolveDraftClient } from "@/lib/campaign-draft-client";
import type { PipelineEvent, ResearchDossier } from "@/lib/labs/pipelines/types";

/** Chime suave (WebAudio) quando o laboratório inicia. Best-effort. */
function playStartChime() {
  try {
    const Ctx =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [880, 1174.66].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      o.connect(g);
      g.connect(ctx.destination);
      const t = now + i * 0.12;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.06, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.start(t);
      o.stop(t + 0.2);
    });
    setTimeout(() => ctx.close().catch(() => {}), 700);
  } catch {
    /* sem áudio */
  }
}

/**
 * Card de pesquisa dos cientistas no criador de campanha. Streama a pipeline
 * (SSE) mostrando cada cientista entrando em tempo real + chime no início, e ao
 * final exibe o dossiê consolidado. Persiste hipóteses do Testing (server-side).
 */
export function CampaignCreatorResearchCard() {
  const { payload, clients } = useCampaignDraft();
  const client = resolveDraftClient(payload.clientSlug, clients);
  const [dossier, setDossier] = useState<ResearchDossier | null>(null);
  const [steps, setSteps] = useState<LiveStep[]>([]);
  const [loading, setLoading] = useState(false);
  const soundRef = useRef(false);

  const signature = client ? `${client.id}|${payload.objective}` : null;

  useEffect(() => {
    if (!signature) return;
    const controller = new AbortController();
    let active = true;
    soundRef.current = false;
    setDossier(null);
    setSteps([]);
    setLoading(true);

    function upsertStep(next: LiveStep) {
      setSteps((prev) => {
        const i = prev.findIndex((s) => s.scientistId === next.scientistId);
        if (i === -1) return [...prev, next];
        const copy = [...prev];
        copy[i] = next;
        return copy;
      });
    }

    function handle(e: PipelineEvent) {
      if (e.phase === "start") {
        if (!soundRef.current) {
          soundRef.current = true;
          playStartChime();
        }
      } else if (e.phase === "scientist_start") {
        upsertStep({ scientistId: e.scientistId, label: e.label, icon: e.icon, status: "running" });
      } else if (e.phase === "scientist_done") {
        upsertStep({
          scientistId: e.scientistId,
          label: e.label,
          icon: e.icon,
          status: e.ran ? "done" : "skipped",
          findings: e.findings
        });
      } else if (e.phase === "done") {
        setDossier(e.dossier);
        setLoading(false);
      }
    }

    (async () => {
      try {
        const res = await fetch("/api/labs/pipeline/stream", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            clientSlug: payload.clientSlug,
            briefing: payload.objective,
            persistHypotheses: true
          }),
          signal: controller.signal
        });
        if (!res.body) {
          setLoading(false);
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const parts = buf.split("\n\n");
          buf = parts.pop() ?? "";
          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith("data:")) continue;
            try {
              if (active) handle(JSON.parse(line.slice(5).trim()) as PipelineEvent);
            } catch {
              /* ignora chunk inválido */
            }
          }
        }
      } catch {
        /* abortado/erro de rede */
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  if (!signature) return null;
  if (!loading && !steps.length && (!dossier || (!dossier.sections.length && !dossier.suggestions.length)))
    return null;

  return (
    <div className="campaign-creator-sidebar-card">
      <ResearchDossierCard dossier={dossier} loading={loading} steps={steps} title="Pesquisa Orion" />
    </div>
  );
}
