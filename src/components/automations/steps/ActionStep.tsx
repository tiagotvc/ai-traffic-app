"use client";

import { Bell, Clock, Layers, Mail, TrendingUp } from "lucide-react";

import { FilterSelectDropdown } from "@/components/FilterSelectDropdown";
import { FilterTextField } from "@/components/FilterTextField";
import { ACTION_OPTIONS, type ActionType, type RuleForm } from "@/lib/automation/rule-templates";

type Props = {
  form: RuleForm;
  update: (patch: Partial<RuleForm>) => void;
};

/** Passo 2 — Ação: o que a regra faz quando a condição é atendida. Gatilho de horário tem ação implícita. */
export function ActionStep({ form, update }: Props) {
  if (form.kind === "schedule") {
    return (
      <div className="campaign-creator-section-stack space-y-4">
        <div>
          <h2 className="font-heading text-base font-semibold text-[var(--text-main)]">Ação (automática)</h2>
        </div>
        <div className="campaign-creator-card campaign-creator-card--compact flex items-start gap-2.5">
          <Clock size={16} className="mt-0.5 shrink-0 text-[var(--ui-accent)]" />
          <p className="font-body text-sm text-[var(--text-dim)]">
            Regras de horário pausam a campanha fora da janela e reativam sozinhas quando ela volta a valer —
            não há outra ação para configurar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="campaign-creator-section-stack space-y-4">
      <div>
        <h2 className="font-heading text-base font-semibold text-[var(--text-main)]">Defina a ação</h2>
      </div>

      <FilterSelectDropdown
        creatorField
        icon={<Bell size={14} />}
        label="Ação (ENTÃO)"
        placeholder="Ação"
        clearable={false}
        value={form.action}
        onChange={(v) => update({ action: v as ActionType })}
        options={ACTION_OPTIONS}
      />

      {form.action === "adjust_budget_percent" ? (
        <FilterTextField
          creatorField
          icon={<TrendingUp size={14} />}
          label="Aumento de orçamento (%)"
          value={String(form.budgetPercent ?? 10)}
          onChange={(v) => update({ budgetPercent: Number(v) || 10 })}
          placeholder="10"
        />
      ) : null}

      {form.action === "scale_gradual" ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <FilterTextField
              creatorField
              icon={<TrendingUp size={14} />}
              label="Aumento por passo (%)"
              value={String(form.budgetPercent ?? 10)}
              onChange={(v) => update({ budgetPercent: Number(v) || 10 })}
              placeholder="10"
            />
            <FilterTextField
              creatorField
              icon={<Layers size={14} />}
              label="Passos (1 por dia)"
              value={String(form.steps ?? 3)}
              onChange={(v) => update({ steps: Math.min(10, Math.max(2, Number(v) || 3)) })}
              placeholder="3"
            />
          </div>
          <p className="font-body text-[11px] text-[var(--text-dimmer)]">
            Aplica um incremento por dia (no máximo) até completar os passos configurados — evita
            tirar a campanha da fase de aprendizado do Meta com um salto único de orçamento.
          </p>
        </>
      ) : null}

      {form.action === "notify_email" ? (
        <FilterTextField
          creatorField
          icon={<Mail size={14} />}
          label="E-mail de destino"
          value={form.recipientEmail ?? ""}
          onChange={(v) => update({ recipientEmail: v })}
          placeholder="voce@agencia.com"
        />
      ) : null}
    </div>
  );
}
