"use client";

import { useCallback, useRef, useState } from "react";

import type { BulkPlanSummary } from "@/lib/audiences/bulk/builders";
import {
  BULK_CREATE_CHUNK_SIZE,
  type BulkAudienceConfig,
  type BulkAudienceItemResult,
  type PlannedAudienceWithStatus
} from "@/lib/audiences/bulk/types";

export type BulkQueuePhase = "idle" | "planning" | "running" | "done";

export type BulkQueueState = {
  phase: BulkQueuePhase;
  plan: PlannedAudienceWithStatus[];
  results: BulkAudienceItemResult[];
  /** Erro que impediu o lote de começar (validação, termos da Meta, rede). */
  error: string | null;
  tosUrl: string | null;
  cancelled: boolean;
  /** Vídeos que a Meta recusou por não estarem ligados a uma Página. */
  rejectedVideoIds: string[];
};

const INITIAL: BulkQueueState = {
  phase: "idle",
  plan: [],
  results: [],
  error: null,
  tosUrl: null,
  cancelled: false,
  rejectedVideoIds: []
};

/**
 * AudienceCreationQueue (lado tela): só despacha. Pede o plano ao servidor e
 * envia os itens em trechos pequenos para mostrar o progresso item a item;
 * nomes, validação e duplicidade são decididos no servidor.
 */
export function useAudienceCreationQueue(scope: { clientSlug: string; adAccountId: string }) {
  const [state, setState] = useState<BulkQueueState>(INITIAL);
  const cancelRef = useRef(false);

  const reset = useCallback(() => {
    cancelRef.current = false;
    setState(INITIAL);
  }, []);

  const cancel = useCallback(() => {
    cancelRef.current = true;
  }, []);

  const start = useCallback(
    async (config: BulkAudienceConfig) => {
      cancelRef.current = false;
      setState({ ...INITIAL, phase: "planning" });
      const base = { clientId: scope.clientSlug, adAccountId: scope.adAccountId, config };

      let plan: PlannedAudienceWithStatus[];
      try {
        const res = await fetch("/api/audiences/bulk/plan", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(base)
        });
        const j = (await res.json()) as {
          ok: boolean;
          plan?: PlannedAudienceWithStatus[];
          summary?: BulkPlanSummary;
          error?: string;
          tosUrl?: string;
        };
        if (!j.ok || !j.plan) {
          setState({ ...INITIAL, error: j.error ?? "Falha ao montar o lote", tosUrl: j.tosUrl ?? null });
          return;
        }
        plan = j.plan;
      } catch {
        setState({ ...INITIAL, error: "Sem conexão com o servidor" });
        return;
      }

      // Já existentes entram no log na hora, sem ida ao servidor.
      const skipped: BulkAudienceItemResult[] = plan
        .filter((p) => p.skip)
        .map((p) => ({ key: p.key, name: p.name, status: "skipped", reason: p.skip! }));
      setState((s) => ({ ...s, phase: "running", plan, results: skipped }));

      const pending = plan.filter((p) => !p.skip);
      // Recusas de um trecho valem para os próximos: não repete a tentativa.
      let rejectedVideoIds: string[] = [];
      for (let i = 0; i < pending.length; i += BULK_CREATE_CHUNK_SIZE) {
        if (cancelRef.current) break;
        const chunk = pending.slice(i, i + BULK_CREATE_CHUNK_SIZE);
        let chunkResults: BulkAudienceItemResult[];
        try {
          const res = await fetch("/api/audiences/bulk/create", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ ...base, keys: chunk.map((c) => c.key), rejectedVideoIds })
          });
          const j = (await res.json()) as {
            ok: boolean;
            results?: BulkAudienceItemResult[];
            rejectedVideoIds?: string[];
            error?: string;
          };
          if (j.rejectedVideoIds) rejectedVideoIds = j.rejectedVideoIds;
          chunkResults =
            j.ok && j.results
              ? j.results
              : chunk.map((c) => ({
                  key: c.key,
                  name: c.name,
                  status: "error" as const,
                  error: j.error ?? "Falha ao criar"
                }));
        } catch {
          chunkResults = chunk.map((c) => ({
            key: c.key,
            name: c.name,
            status: "error" as const,
            error: "Sem conexão com o servidor"
          }));
        }
        setState((s) => ({ ...s, results: [...s.results, ...chunkResults], rejectedVideoIds }));
      }

      setState((s) => ({ ...s, phase: "done", cancelled: cancelRef.current }));
    },
    [scope.clientSlug, scope.adAccountId]
  );

  return { state, start, cancel, reset };
}
