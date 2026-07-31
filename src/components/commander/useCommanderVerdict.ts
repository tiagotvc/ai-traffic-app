"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { CommanderVerdictDomain } from "@/lib/commander/verdict";

export type CommanderVerdictResult = {
  verdict: "approve" | "needs_work";
  headline: string;
  reasons: string[];
  fixes: string[];
  suggestions: string[];
  confidence: number;
};

export type CommanderVerdictChecklistItem = { label: string; complete: boolean };

/**
 * Dispara uma chamada real de IA (`/api/commander/verdict`) sempre que `enabled`
 * transita de false para true (ex.: entrou na revisão final / abriu o modal de
 * resumo) — nunca a cada mudança de rascunho, e nunca enquanto `enabled` permanece
 * true. Se o consumidor não desmonta entre uma abertura e outra (ex.: um modal que
 * só esconde/mostra), reabrir ainda assim reavalia o rascunho atual em vez de
 * mostrar um veredito antigo. `buildContext` só é chamado no momento do disparo.
 */
export function useCommanderVerdict({
  domain,
  clientSlug,
  enabled,
  buildContext
}: {
  domain: CommanderVerdictDomain;
  clientSlug: string | null | undefined;
  enabled: boolean;
  buildContext: () => { contextSummary: string; checklist?: CommanderVerdictChecklistItem[] };
}) {
  const [verdict, setVerdict] = useState<CommanderVerdictResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const buildContextRef = useRef(buildContext);
  buildContextRef.current = buildContext;
  const wasEnabledRef = useRef(false);
  // Zonas não têm cliente associado — só campanha/persona exigem clientSlug.
  const hasRequiredClient = domain === "zone" || Boolean(clientSlug);

  const run = useCallback(() => {
    if (!hasRequiredClient) return;
    setLoading(true);
    setError(null);
    const { contextSummary, checklist } = buildContextRef.current();
    fetch("/api/commander/verdict", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ domain, clientSlug: clientSlug ?? undefined, contextSummary, checklist })
    })
      .then((r) => r.json())
      .then((j: { ok?: boolean; verdict?: CommanderVerdictResult; error?: string }) => {
        if (!j.ok || !j.verdict) throw new Error(j.error ?? "Falha ao gerar veredito");
        setVerdict(j.verdict);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Falha ao gerar veredito"))
      .finally(() => setLoading(false));
  }, [domain, clientSlug, hasRequiredClient]);

  useEffect(() => {
    const wasEnabled = wasEnabledRef.current;
    wasEnabledRef.current = enabled;
    if (!enabled || wasEnabled || !hasRequiredClient) return;
    run();
  }, [enabled, hasRequiredClient, run]);

  return { verdict, loading, error, retry: run };
}
