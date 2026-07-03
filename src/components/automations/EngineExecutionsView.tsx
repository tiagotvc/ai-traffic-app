"use client";

import { useCallback, useEffect, useState } from "react";
import { History } from "lucide-react";

import { AppPageShell } from "@/components/layout/AppPageShell";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { actionLabel } from "@/lib/automation/rule-templates";

/**
 * Histórico global do Orion Engine (Nível 5 do motor de regras): toda execução — de
 * regra, chat ou creator — com status e motivo. É o que faz alguém confiar na automação.
 */

type ExecutionRow = {
  id: string;
  source: "rule" | "chat" | "creator" | "workflow";
  actionType: string;
  status: "pending" | "rejected" | "executed" | "failed";
  metaCampaignId: string | null;
  campaignName: string | null;
  description: string;
  error: string | null;
  createdAt: string;
  executedAt: string | null;
};

const STATUS_FILTERS = [
  { value: "", label: "Todas" },
  { value: "executed", label: "Executadas" },
  { value: "pending", label: "Pendentes" },
  { value: "rejected", label: "Rejeitadas" },
  { value: "failed", label: "Falhas" }
] as const;

const SOURCE_LABEL: Record<ExecutionRow["source"], string> = {
  rule: "Regra",
  chat: "Chat",
  creator: "Criador",
  workflow: "Workflow"
};

const STATUS_LABEL: Record<ExecutionRow["status"], string> = {
  executed: "Executada",
  pending: "Aguardando aprovação",
  rejected: "Rejeitada",
  failed: "Falhou"
};

function statusBadgeClass(status: ExecutionRow["status"]): string {
  if (status === "executed") return "ds-table-compact-badge ds-table-compact-badge--success";
  // "failed" usa badge neutro + linha de erro em vermelho logo abaixo (não há variante --danger).
  return "ds-table-compact-badge ds-table-compact-badge--neutral";
}

export function EngineExecutionsView() {
  const [rows, setRows] = useState<ExecutionRow[]>([]);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const qs = status ? `?status=${status}` : "";
    fetch(`/api/automation/executions${qs}`)
      .then((r) => r.json())
      .then((j: { executions?: ExecutionRow[] }) => setRows(j.executions ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AppPageShell as="main" gap="loose" className="flex-1 overflow-y-auto">
      <div className="space-y-6">
        <PageToolbar
          icon={<History size={16} />}
          title="Execuções do Engine"
          subtitle="Tudo que o Orion Engine executou ou enfileirou — com o motivo de cada disparo."
          showGlobalFilters={false}
          showSync={false}
        />

        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatus(f.value)}
              className={
                status === f.value
                  ? "ui-btn-accent inline-flex h-8 items-center px-3 font-heading text-xs font-semibold"
                  : "ui-btn-secondary inline-flex h-8 items-center px-3 font-heading text-xs font-medium"
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="campaign-creator-card p-8 text-center font-body text-xs text-[var(--text-dim)]">
            Carregando execuções…
          </div>
        ) : rows.length === 0 ? (
          <div className="campaign-creator-card p-8 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--creator-card-bg-inset)] text-[var(--text-dimmer)]">
              <History size={24} />
            </span>
            <div className="mt-3 font-heading text-sm font-semibold text-[var(--text-main)]">
              Nenhuma execução ainda
            </div>
            <p className="mt-1 font-body text-xs text-[var(--text-dim)]">
              Quando uma regra disparar (ou uma ação do chat/criador rodar), o histórico aparece aqui.
            </p>
          </div>
        ) : (
          <div className="ui-campaign-table-shell ui-campaign-table-shell--compact overflow-hidden">
            {rows.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-start gap-3 border-b border-[var(--creator-card-border)] p-4 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-heading text-sm font-semibold text-[var(--text-main)]">
                      {row.campaignName ?? row.metaCampaignId ?? "—"}
                    </span>
                    <span className="ds-table-compact-badge ds-table-compact-badge--neutral">
                      {actionLabel(row.actionType)}
                    </span>
                    <span className={statusBadgeClass(row.status)}>{STATUS_LABEL[row.status]}</span>
                    <span className="font-body text-[10px] uppercase tracking-wide text-[var(--text-dimmer)]">
                      via {SOURCE_LABEL[row.source] ?? row.source}
                    </span>
                  </div>
                  <p className="mt-1 font-body text-[11px] text-[var(--text-dim)]">{row.description}</p>
                  {row.error ? (
                    <p className="mt-1 font-body text-[11px] text-red-400">Erro: {row.error}</p>
                  ) : null}
                  <p className="mt-1 font-body text-[10px] text-[var(--text-dimmer)]">
                    {new Date(row.createdAt).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppPageShell>
  );
}
