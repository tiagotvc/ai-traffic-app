"use client";

import { Zap } from "lucide-react";

import { actionLabel, conditionText, type RuleForm } from "@/lib/automation/rule-templates";

/** Card de pré-visualização ao vivo da regra (SE … ENTÃO …), exibido na sidebar do stepper. */
export function AutomationRulePreviewCard({ form, enabled }: { form: RuleForm; enabled: boolean }) {
  return (
    <div className="campaign-creator-card campaign-creator-card--compact space-y-3">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
          <Zap size={14} />
        </span>
        <span className="font-heading text-sm font-semibold text-[var(--text-main)]">
          {form.name.trim() || "Nova regra"}
        </span>
        <span
          className={
            enabled
              ? "ds-table-compact-badge ds-table-compact-badge--success ml-auto"
              : "ds-table-compact-badge ds-table-compact-badge--neutral ml-auto"
          }
        >
          {enabled ? "Ativa" : "Pausada"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 font-body text-[11px]">
        <span className="rounded-md border border-[var(--creator-card-border)] bg-[var(--creator-card-bg-inset)] px-2 py-1 font-medium text-[var(--text-dim)]">
          SE {conditionText(
            form.kind === "schedule"
              ? { schedule: form.schedule }
              : { groups: form.groups, minSpend: form.minSpend }
          )}
        </span>
        <span className="text-[var(--text-dimmer)]">→</span>
        <span className="rounded-md border border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] px-2 py-1 font-medium text-[var(--ui-accent)]">
          {actionLabel(form.action)}
          {form.action === "adjust_budget_percent" ? ` (+${form.budgetPercent ?? 10}%)` : ""}
        </span>
      </div>

      <p className="font-body text-[11px] text-[var(--text-dimmer)]">
        Avaliada a cada sincronização da Meta. Só dispara quando a condição é atendida.
      </p>
    </div>
  );
}
