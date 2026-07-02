"use client";

import { Building2, ShieldCheck, Zap } from "lucide-react";

import { FilterSelectDropdown } from "@/components/FilterSelectDropdown";
import { FilterTextField } from "@/components/FilterTextField";
import { AutomationRulePreviewCard } from "@/components/automations/AutomationRulePreviewCard";
import { AutomationRuleSimulationCard } from "@/components/automations/AutomationRuleSimulationCard";
import { useAutomationTier } from "@/hooks/useAutomationTier";
import { EXECUTION_MODE_OPTIONS, type ExecutionMode, type RuleForm } from "@/lib/automation/rule-templates";

type Props = {
  form: RuleForm;
  update: (patch: Partial<RuleForm>) => void;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  error: string | null;
  clients: Array<{ id: string; name: string }>;
};

/** Passo 3 — Revisão: nome, escopo, modo de execução, status e confirmação antes de salvar. */
export function ReviewStep({ form, update, enabled, onEnabledChange, error, clients }: Props) {
  const tier = useAutomationTier();
  // `alert_only` nunca executa nada destrutivo — não faz sentido escolher um modo de execução.
  const showExecutionMode =
    tier >= 2 && form.action !== "alert_only" && form.action !== "notify_email";

  return (
    <div className="campaign-creator-section-stack space-y-4">
      <div>
        <h2 className="font-heading text-base font-semibold text-[var(--text-main)]">Ative e relaxe</h2>
      </div>

      <FilterTextField
        creatorField
        icon={<Zap size={14} />}
        label="Nome"
        value={form.name}
        onChange={(v) => update({ name: v })}
        placeholder="Ex.: Pausar CPL alto"
      />

      <FilterSelectDropdown
        creatorField
        icon={<Building2 size={14} />}
        label="Aplicar a"
        placeholder="Todos os clientes"
        clearable={false}
        value={form.clientId ?? ""}
        onChange={(v) => update({ clientId: v || null })}
        options={[
          { value: "", label: "Todos os clientes" },
          ...clients.map((c) => ({ value: c.id, label: c.name }))
        ]}
      />

      {showExecutionMode ? (
        <div>
          <FilterSelectDropdown
            creatorField
            icon={<ShieldCheck size={14} />}
            label="Modo de execução"
            placeholder="Automático"
            clearable={false}
            value={form.executionMode}
            onChange={(v) => update({ executionMode: v as ExecutionMode })}
            options={EXECUTION_MODE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
          <p className="mt-1.5 font-body text-[11px] text-[var(--text-dimmer)]">
            {EXECUTION_MODE_OPTIONS.find((o) => o.value === form.executionMode)?.description}
          </p>
        </div>
      ) : null}

      <AutomationRulePreviewCard form={form} enabled={enabled} />

      {tier >= 2 ? <AutomationRuleSimulationCard form={form} /> : null}

      <label className="flex cursor-pointer items-center gap-2 font-body text-sm text-[var(--text-dim)]">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          className="accent-[var(--ui-accent)]"
        />
        Ativar a regra assim que salvar
      </label>

      {error ? <div className="ui-alert-danger text-sm">{error}</div> : null}
    </div>
  );
}
