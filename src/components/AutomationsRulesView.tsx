"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Bell, Check, ChevronDown, ChevronUp, Clock, History, Plus, Trash2, X, Zap } from "lucide-react";

import { useRouter } from "@/i18n/navigation";

import { PageToolbar } from "@/components/layout/PageToolbar";
import { AppPageShell } from "@/components/layout/AppPageShell";
import { AutomationCreateModeModal } from "@/components/automations/AutomationCreateModeModal";
import { UxAutomationsPageSkeleton } from "@/uxpilot-ui/adapters/ux-skeleton";
import { useAutomationTier } from "@/hooks/useAutomationTier";
import { actionLabel, conditionText, formatLastRun } from "@/lib/automation/rule-templates";

type Rule = {
  id: string;
  name: string;
  enabled: boolean;
  condition: {
    match?: string;
    conditions?: Array<{ metric?: string; op?: string; value?: number }>;
    metric?: string;
    op?: string;
    value?: number;
    minSpend?: number;
  };
  action: { type?: string };
  executionCount?: number;
  lastExecutionAt?: string | null;
};

type RuleExecution = {
  id: string;
  createdAt: string;
  title: string;
  description: string;
  severity: "critical" | "warning";
};

type PendingAction = {
  id: string;
  metaCampaignId: string;
  campaignName?: string | null;
  actionType: string;
  description: string;
  createdAt: string;
};

export function AutomationsRulesView() {
  const router = useRouter();
  const tier = useAutomationTier();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);
  const [executionsByRule, setExecutionsByRule] = useState<Record<string, RuleExecution[] | "loading">>({});

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/automation/rules")
      .then((r) => r.json())
      .then((j) => setRules((j.rules ?? []) as Rule[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const loadPending = useCallback(() => {
    fetch("/api/automation/pending-actions")
      .then((r) => r.json())
      .then((j) => setPendingActions((j.actions ?? []) as PendingAction[]))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (tier >= 2) loadPending();
  }, [tier, loadPending]);

  function resolvePending(action: PendingAction, decision: "approve" | "reject") {
    setResolvingId(action.id);
    fetch(`/api/automation/pending-actions/${action.id}/${decision}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    })
      .then(() => {
        loadPending();
        load();
      })
      .finally(() => setResolvingId(null));
  }

  function openCreate() {
    setModalOpen(true);
  }

  function toggleExecutions(rule: Rule) {
    if (expandedRuleId === rule.id) {
      setExpandedRuleId(null);
      return;
    }
    setExpandedRuleId(rule.id);
    if (executionsByRule[rule.id]) return;
    setExecutionsByRule((prev) => ({ ...prev, [rule.id]: "loading" }));
    fetch(`/api/automation/rules/${rule.id}/executions`)
      .then((r) => r.json())
      .then((j) =>
        setExecutionsByRule((prev) => ({
          ...prev,
          [rule.id]: (j.executions ?? []) as RuleExecution[]
        }))
      )
      .catch(() => setExecutionsByRule((prev) => ({ ...prev, [rule.id]: [] })));
  }

  function toggle(rule: Rule) {
    startTransition(async () => {
      await fetch(`/api/automation/rules/${rule.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: !rule.enabled })
      });
      load();
    });
  }

  function remove(rule: Rule) {
    if (!confirm(`Excluir a regra "${rule.name}"?`)) return;
    startTransition(async () => {
      await fetch(`/api/automation/rules/${rule.id}`, { method: "DELETE" });
      load();
    });
  }

  if (loading) {
    return <UxAutomationsPageSkeleton />;
  }

  return (
    <AppPageShell as="main" gap="loose" className="flex-1 overflow-y-auto">
      <div data-agency-brain-shell className="space-y-6">
        <PageToolbar
          icon={<Zap size={16} />}
          title="Automações"
          subtitle="Crie regras se-então para pausar, alertar ou escalar campanhas conforme a performance."
          showGlobalFilters={false}
          showSync={false}
          actions={
            <button
              type="button"
              onClick={openCreate}
              className="ui-btn-accent ui-btn-responsive font-heading font-bold"
            >
              <Plus size={15} />
              <span className="ui-btn-responsive-label">Criar regra</span>
            </button>
          }
        />

        {pendingActions.length ? (
          <div>
            <h3 className="campaign-creator-orion-section-label mb-3">
              Pendentes de aprovação ({pendingActions.length})
            </h3>
            <div className="ui-campaign-table-shell ui-campaign-table-shell--compact overflow-hidden">
              {pendingActions.map((action) => (
                <div
                  key={action.id}
                  className="flex flex-wrap items-center gap-3 border-b border-[var(--creator-card-border)] p-4 last:border-0"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
                    <Clock size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-heading text-sm font-semibold text-[var(--text-main)]">
                        {action.campaignName ?? action.metaCampaignId}
                      </span>
                      <span className="ds-table-compact-badge ds-table-compact-badge--neutral">
                        {actionLabel(action.actionType)}
                      </span>
                    </div>
                    <p className="mt-1 font-body text-[11px] text-[var(--text-dimmer)]">
                      {action.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => resolvePending(action, "approve")}
                    disabled={resolvingId === action.id}
                    className="ui-btn-accent inline-flex h-8 items-center justify-center gap-1.5 px-3 font-heading text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Check size={14} strokeWidth={2.5} />
                    Aprovar
                  </button>
                  <button
                    type="button"
                    onClick={() => resolvePending(action, "reject")}
                    disabled={resolvingId === action.id}
                    className="ds-table-compact-action ds-table-compact-action--danger p-1.5"
                    title="Rejeitar"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <h3 className="campaign-creator-orion-section-label mb-3">
            Suas regras {rules.length ? `(${rules.length})` : ""}
          </h3>
          {rules.length === 0 ? (
            <div className="campaign-creator-card p-8 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--creator-card-bg-inset)] text-[var(--text-dimmer)]">
                <Bell size={24} />
              </span>
              <div className="mt-3 font-heading text-sm font-semibold text-[var(--text-main)]">
                Nenhuma regra ainda
              </div>
              <p className="mt-1 font-body text-xs text-[var(--text-dim)]">
                Crie sua primeira regra a partir de um modelo ou do zero. As regras são avaliadas a cada
                sincronização e agem sozinhas.
              </p>
            </div>
          ) : (
            <div className="ui-campaign-table-shell ui-campaign-table-shell--compact overflow-hidden">
              {rules.map((rule) => (
                <div key={rule.id} className="border-b border-[var(--creator-card-border)] last:border-0">
                <div className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-heading text-sm font-semibold text-[var(--text-main)]">
                        {rule.name}
                      </span>
                      <span
                        className={
                          rule.enabled
                            ? "ds-table-compact-badge ds-table-compact-badge--success"
                            : "ds-table-compact-badge ds-table-compact-badge--neutral"
                        }
                      >
                        {rule.enabled ? "Ativa" : "Pausada"}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 font-body text-[11px]">
                      <span className="rounded-md border border-[var(--creator-card-border)] bg-[var(--creator-card-bg-inset)] px-2 py-1 font-medium text-[var(--text-dim)]">
                        SE {conditionText(rule.condition)}
                      </span>
                      <span className="text-[var(--text-dimmer)]">→</span>
                      <span className="rounded-md border border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] px-2 py-1 font-medium text-[var(--ui-accent)]">
                        {actionLabel(rule.action.type)}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 font-body text-[11px] text-[var(--text-dimmer)]">
                      <span>
                        {rule.executionCount && rule.executionCount > 0
                          ? `${rule.executionCount} execução(ões)${
                              formatLastRun(rule.lastExecutionAt)
                                ? ` · última ${formatLastRun(rule.lastExecutionAt)}`
                                : ""
                            }`
                          : "Ainda não disparou"}
                      </span>
                      {rule.executionCount && rule.executionCount > 0 ? (
                        <button
                          type="button"
                          onClick={() => toggleExecutions(rule)}
                          className="inline-flex items-center gap-1 font-medium text-[var(--ui-accent)] hover:underline"
                        >
                          <History size={12} />
                          {expandedRuleId === rule.id ? "Ocultar execuções" : "Ver execuções"}
                          {expandedRuleId === rule.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 font-body text-xs text-[var(--text-dim)]">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      disabled={isPending}
                      onChange={() => toggle(rule)}
                      className="accent-[var(--ui-accent)]"
                    />
                    Ativa
                  </label>
                  <button
                    type="button"
                    onClick={() => remove(rule)}
                    className="ds-table-compact-action ds-table-compact-action--danger p-1.5"
                    title="Excluir"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                {expandedRuleId === rule.id ? (
                  <div className="border-t border-[var(--creator-card-border)] bg-[var(--creator-card-bg-inset,var(--surface-bg))] px-4 py-3">
                    {executionsByRule[rule.id] === "loading" || !executionsByRule[rule.id] ? (
                      <p className="font-body text-[11px] text-[var(--text-dimmer)]">Carregando execuções…</p>
                    ) : (executionsByRule[rule.id] as RuleExecution[]).length === 0 ? (
                      <p className="font-body text-[11px] text-[var(--text-dimmer)]">
                        Nenhuma execução registrada.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {(executionsByRule[rule.id] as RuleExecution[]).map((exec) => (
                          <li key={exec.id} className="flex items-start gap-2">
                            <span
                              className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                                exec.severity === "critical" ? "bg-red-500" : "bg-amber-500"
                              }`}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="font-body text-[11px] text-[var(--text-dim)]">{exec.description}</p>
                              <p className="mt-0.5 font-body text-[10px] text-[var(--text-dimmer)]">
                                {new Date(exec.createdAt).toLocaleString("pt-BR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AutomationCreateModeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelectCustom={() => {
          setModalOpen(false);
          router.push("/automations/rules/new?mode=custom");
        }}
        onSelectTemplate={(templateId) => {
          setModalOpen(false);
          router.push(`/automations/rules/new?template=${templateId}`);
        }}
      />
    </AppPageShell>
  );
}
