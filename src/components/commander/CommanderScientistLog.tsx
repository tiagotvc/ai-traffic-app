"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

import { SCIENTIST_ROWS } from "./CommanderStatusList";
import type { ResolvedMap } from "./useCommanderPreferences";

type ScientistRunDto = {
  id: string;
  scientistId: string;
  clientName: string | null;
  ran: boolean;
  reason: string | null;
  summary: string | null;
  findingsCount: number;
  confidence: number | null;
  createdAt: string;
};

/** `SCIENTIST_ROWS[].id` é `commander.scientists.<id>` — o log grava só o `<id>`. */
function scientistKey(rowId: string): string {
  return rowId.replace("commander.scientists.", "");
}

const MAX_VISIBLE_PER_SCIENTIST = 5;

/**
 * Mesma lista de toggles de `StatusList`, mas com um log expansível por Scientist logo
 * abaixo — última execução real (rodou ou skip), pra quem pergunta "o que ele fez de
 * verdade" em vez de só "está ligado".
 */
export function CommanderScientistLog({
  resolved,
  disabled,
  loading,
  savingId,
  onToggle
}: {
  resolved: ResolvedMap;
  disabled: Set<string>;
  loading: boolean;
  savingId: string | null;
  onToggle: (id: string, next: boolean) => void;
}) {
  const [runs, setRuns] = useState<ScientistRunDto[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/commander/scientists/runs")
      .then((r) => r.json())
      .then((j) => setRuns(j.ok ? (j.runs ?? []) : []))
      .catch(() => setRuns([]));
  }, []);

  const runsByScientist = new Map<string, ScientistRunDto[]>();
  for (const run of runs ?? []) {
    const list = runsByScientist.get(run.scientistId) ?? [];
    list.push(run);
    runsByScientist.set(run.scientistId, list);
  }

  return (
    <div className="ui-campaign-table-shell ui-campaign-table-shell--compact overflow-hidden">
      {SCIENTIST_ROWS.map((row) => {
        const key = scientistKey(row.id);
        const rowRuns = (runsByScientist.get(key) ?? []).slice(0, MAX_VISIBLE_PER_SCIENTIST);
        const platformOn = resolved[row.id] !== false;
        const userOn = !disabled.has(row.id);
        const on = platformOn && userOn;
        const isExpanded = expanded === key;

        return (
          <div key={row.id} className="border-b border-[var(--creator-card-border)] last:border-0">
            <div className="flex flex-wrap items-center gap-3 p-4">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  row.tone ?? "bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]"
                }`}
              >
                {row.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-heading text-sm font-semibold text-[var(--text-main)]">
                    {row.label}
                  </span>
                  <span
                    className={
                      on
                        ? "ds-table-compact-badge ds-table-compact-badge--success"
                        : "ds-table-compact-badge ds-table-compact-badge--neutral"
                    }
                  >
                    {loading ? "…" : on ? "Ativo" : "Desligado"}
                  </span>
                  {!platformOn ? (
                    <span className="font-body text-[10px] text-[var(--text-dimmer)]">
                      (indisponível no seu plano)
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 font-body text-[11px] text-[var(--text-dimmer)]">{row.description}</p>
              </div>
              <label
                className={`flex shrink-0 cursor-pointer items-center gap-2 font-body text-xs text-[var(--text-dim)] ${
                  !platformOn ? "cursor-not-allowed opacity-40" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={userOn}
                  disabled={loading || !platformOn || savingId === row.id}
                  onChange={(e) => onToggle(row.id, e.target.checked)}
                  className="accent-[var(--ui-accent)]"
                />
                Quero isso ligado
              </label>
            </div>

            <button
              type="button"
              onClick={() => setExpanded(isExpanded ? null : key)}
              className="flex w-full items-center gap-1.5 border-t border-[var(--creator-card-border)] bg-[var(--surface-bg)]/30 px-4 py-2 text-left font-body text-[11px] font-medium text-[var(--text-dim)] transition-colors hover:text-[var(--text-main)]"
            >
              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              {runs === null
                ? "Carregando histórico…"
                : rowRuns.length === 0
                  ? "Sem execuções ainda"
                  : `${rowRuns.length} execução${rowRuns.length === 1 ? "" : "ões"} recente${rowRuns.length === 1 ? "" : "s"}`}
            </button>

            {isExpanded && rowRuns.length > 0 ? (
              <div className="flex flex-col gap-2 border-t border-[var(--creator-card-border)] bg-[var(--surface-bg)]/30 p-3">
                {rowRuns.map((run) => (
                  <div
                    key={run.id}
                    className="rounded-lg border border-[var(--creator-card-border)] bg-[var(--surface-card)] p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-body text-[11px] font-semibold text-[var(--text-main)]">
                        {run.clientName ?? "Sem cliente"}
                      </span>
                      <span className="shrink-0 font-body text-[10px] text-[var(--text-dimmer)]">
                        {new Date(run.createdAt).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    {run.ran ? (
                      <>
                        {run.summary ? (
                          <p className="mt-1 font-body text-[11px] leading-relaxed text-[var(--text-dim)]">
                            {run.summary}
                          </p>
                        ) : null}
                        <p className="mt-1 font-body text-[10px] text-[var(--text-dimmer)]">
                          {run.findingsCount} achado{run.findingsCount === 1 ? "" : "s"}
                          {run.confidence != null ? ` · ${run.confidence}% confiança` : ""}
                        </p>
                      </>
                    ) : (
                      <p className="mt-1 font-body text-[11px] text-[var(--text-dimmer)]">
                        Não rodou{run.reason ? ` — ${run.reason}` : ""}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
