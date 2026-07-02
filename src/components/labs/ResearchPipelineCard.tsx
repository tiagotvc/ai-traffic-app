"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ResearchDossierCard, type LiveStep } from "@/components/labs/ResearchDossierCard";
import type { PipelineEvent, ResearchDossier, ResearchScope, ResearchSection } from "@/lib/labs/pipelines/types";

/** Chime suave (WebAudio) quando o laboratório inicia. Best-effort. */
function playStartChime() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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

function mergeDossierSections(prev: ResearchSection[], next: ResearchSection[]): ResearchSection[] {
  const map = new Map<string, ResearchSection>();
  for (const s of prev) map.set(s.scientistId, s);
  for (const s of next) map.set(s.scientistId, s);
  return [...map.values()];
}

function mergeDossiers(prev: ResearchDossier | null, next: ResearchDossier): ResearchDossier {
  const sections = mergeDossierSections(prev?.sections ?? [], next.sections);
  const skipped = [...new Set([...(prev?.skipped ?? []), ...next.skipped])].filter(
    (id) => !sections.some((s) => s.scientistId === id)
  );
  const suggestionMap = new Map<string, ResearchDossier["suggestions"][number]>();
  for (const s of [...(prev?.suggestions ?? []), ...next.suggestions]) {
    suggestionMap.set(s.title, s);
  }
  return {
    pipelineId: next.pipelineId,
    label: next.label,
    sections,
    suggestions: [...suggestionMap.values()].slice(0, 6),
    confidence: next.confidence ?? prev?.confidence,
    skipped,
    reach: next.reach ?? prev?.reach
  };
}

/**
 * Card reutilizável: streama a pipeline (SSE) com feed ao vivo + chime e exibe o
 * dossiê. Mantém o shell visível após o primeiro mount — nunca desmonta o painel
 * entre fases ou re-runs; só atualiza conteúdo incrementalmente.
 */
export function ResearchPipelineCard({
  scope,
  signature,
  shellSignature,
  requestBody,
  title = "Commander",
  dossierLabelKey
}: {
  scope: ResearchScope;
  /** Muda quando deve re-rodar a pipeline (passo, orçamento, etc.) */
  signature: string | null;
  /** Quando definido, o painel permanece visível enquanto houver shell (cliente+objetivo) */
  shellSignature?: string | null;
  requestBody: Record<string, unknown>;
  title?: string;
  /** i18n key under campaignCreator for dossier phase label */
  dossierLabelKey?: string;
}) {
  const [dossier, setDossier] = useState<ResearchDossier | null>(null);
  const [steps, setSteps] = useState<LiveStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [shellVisible, setShellVisible] = useState(false);
  const soundRef = useRef(false);
  const runIdRef = useRef(0);

  const visibleShell = Boolean(shellSignature ?? signature);

  const upsertStep = useCallback((next: LiveStep) => {
    setSteps((prev) => {
      const i = prev.findIndex((s) => s.scientistId === next.scientistId);
      if (i === -1) return [...prev, next];
      const copy = [...prev];
      copy[i] = { ...copy[i], ...next };
      return copy;
    });
  }, []);

  useEffect(() => {
    if (!signature) return;

    setShellVisible(true);
    const runId = ++runIdRef.current;
    const controller = new AbortController();
    soundRef.current = false;
    setLoading(true);

    function handle(e: PipelineEvent) {
      if (runId !== runIdRef.current) return;

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
      } else if (e.phase === "reach") {
        setDossier((prev) => (prev ? { ...prev, reach: e.reach } : prev));
      } else if (e.phase === "done") {
        setDossier((prev) => mergeDossiers(prev, e.dossier));
        setLoading(false);
      }
    }

    (async () => {
      try {
        const res = await fetch("/api/labs/pipeline/stream", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ scope, ...requestBody }),
          signal: controller.signal
        });
        if (!res.body) {
          if (runId === runIdRef.current) setLoading(false);
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
              handle(JSON.parse(line.slice(5).trim()) as PipelineEvent);
            } catch {
              /* chunk inválido */
            }
          }
        }
      } catch {
        /* abortado/erro */
      } finally {
        if (runId === runIdRef.current) setLoading(false);
      }
    })();

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, upsertStep]);

  useEffect(() => {
    if (visibleShell) setShellVisible(true);
  }, [visibleShell]);

  if (!visibleShell && !shellVisible) return null;

  return (
    <ResearchDossierCard
      dossier={dossier}
      loading={loading}
      steps={steps}
      title={title}
      dossierLabelKey={dossierLabelKey}
      forceVisible
    />
  );
}
