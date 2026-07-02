"use client";

import { Clock, Plus, TrendingDown, TrendingUp, Trash2, Wallet, Zap } from "lucide-react";

import { cn } from "@/lib/cn";
import { FilterSelectDropdown } from "@/components/FilterSelectDropdown";
import { FilterTextField } from "@/components/FilterTextField";
import {
  METRIC_OPTIONS,
  OP_OPTIONS,
  type Condition,
  type ConditionGroup,
  type Metric,
  type Op,
  type RuleForm,
  type RuleKind
} from "@/lib/automation/rule-templates";

type Props = {
  form: RuleForm;
  update: (patch: Partial<RuleForm>) => void;
};

const MAX_GROUPS = 4;
const MAX_CONDITIONS_PER_GROUP = 5;
const DEFAULT_CONDITION: Condition = { metric: "cpl", op: "gt", value: 0 };
const DEFAULT_GROUP_CONDITION: Condition = { metric: "spend", op: "gt", value: 0 };

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => ({
  value: String(h),
  label: `${String(h).padStart(2, "0")}h`
}));

const KIND_OPTIONS: Array<{ value: RuleKind; label: string; icon: typeof TrendingDown }> = [
  { value: "metric", label: "Métrica", icon: TrendingDown },
  { value: "schedule", label: "Horário", icon: Clock }
];

/**
 * Passo 1 — Gatilho: condições de métrica em grupos (E dentro do grupo, OU entre grupos) + gasto
 * mínimo, ou janela de horário. O tipo é escolhido no toggle Métrica/Horário.
 */
export function TriggerStep({ form, update }: Props) {
  const groups: ConditionGroup[] = form.groups.length ? form.groups : [[DEFAULT_CONDITION]];
  const multiClause = groups.length > 1 || groups.some((g) => g.length > 1);

  const patchCondition = (gi: number, ci: number, patch: Partial<Condition>) => {
    update({
      groups: groups.map((g, i) => (i === gi ? g.map((c, j) => (j === ci ? { ...c, ...patch } : c)) : g))
    });
  };

  const addConditionToLastGroup = () => {
    const lastIndex = groups.length - 1;
    if (groups[lastIndex].length >= MAX_CONDITIONS_PER_GROUP) return;
    update({
      groups: groups.map((g, i) => (i === lastIndex ? [...g, DEFAULT_GROUP_CONDITION] : g))
    });
  };

  const addGroup = () => {
    if (groups.length >= MAX_GROUPS) return;
    update({ groups: [...groups, [DEFAULT_GROUP_CONDITION]] });
  };

  const removeCondition = (gi: number, ci: number) => {
    const group = groups[gi];
    if (group.length > 1) {
      update({ groups: groups.map((g, i) => (i === gi ? g.filter((_, j) => j !== ci) : g)) });
      return;
    }
    if (groups.length > 1) {
      update({ groups: groups.filter((_, i) => i !== gi) });
    }
  };

  const canAddCondition = groups[groups.length - 1].length < MAX_CONDITIONS_PER_GROUP;
  const canAddGroup = groups.length < MAX_GROUPS;

  return (
    <div className="campaign-creator-section-stack space-y-4">
      <div>
        <h2 className="font-heading text-base font-semibold text-[var(--text-main)]">Escolha um gatilho</h2>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div
          className="inline-flex rounded-lg border border-[var(--border-color)] p-1"
          role="radiogroup"
          aria-label="Tipo de gatilho"
        >
          {KIND_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const selected = form.kind === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => update({ kind: opt.value })}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-heading text-xs font-semibold transition-colors",
                  selected
                    ? "bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]"
                    : "text-[var(--text-dim)] hover:text-[var(--text-main)]"
                )}
              >
                <Icon size={14} />
                {opt.label}
              </button>
            );
          })}
        </div>
        {form.kind === "metric" && canAddCondition ? (
          <button
            type="button"
            onClick={addConditionToLastGroup}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-[var(--border-hover)] px-2.5 py-1 font-heading text-xs font-semibold text-[var(--text-dim)] transition-colors hover:border-[var(--ui-accent)] hover:text-[var(--ui-accent)]"
          >
            <Plus size={13} strokeWidth={2.5} />
            Adicionar condição
          </button>
        ) : null}
      </div>

      {form.kind === "schedule" ? (
        <div>
          <p className="campaign-creator-orion-section-label mb-1.5">Horário comercial</p>
          <div className="grid grid-cols-2 gap-2">
            <FilterSelectDropdown
              creatorField
              icon={<Clock size={14} />}
              label="Início"
              placeholder="Início"
              clearable={false}
              value={String(form.schedule.startHour)}
              onChange={(v) => update({ schedule: { ...form.schedule, startHour: Number(v) } })}
              options={HOUR_OPTIONS}
            />
            <FilterSelectDropdown
              creatorField
              icon={<Clock size={14} />}
              label="Fim"
              placeholder="Fim"
              clearable={false}
              value={String(form.schedule.endHour)}
              onChange={(v) => update({ schedule: { ...form.schedule, endHour: Number(v) } })}
              options={HOUR_OPTIONS}
            />
          </div>
          <p className="mt-2 font-body text-[11px] text-[var(--text-dimmer)]">
            Fora dessa janela (todo dia, horário de Brasília) as campanhas são pausadas; dentro dela, reativadas
            automaticamente — só as que a própria regra pausou.
          </p>
        </div>
      ) : (
        <div>
          <p className="campaign-creator-orion-section-label mb-1.5">Condição (SE)</p>

          <div className="space-y-2">
            {groups.map((group, gi) => (
              <div key={gi}>
                {gi > 0 ? (
                  <div className="my-2 flex items-center gap-2">
                    <span className="inline-flex items-center rounded-md border border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] px-2 py-0.5 font-heading text-[10px] font-bold uppercase tracking-wide text-[var(--ui-accent)]">
                      OU
                    </span>
                    <span className="h-px flex-1 bg-[var(--border-color)]" />
                  </div>
                ) : null}
                <div
                  className={
                    groups.length > 1
                      ? "space-y-2 rounded-lg border border-[var(--border-color)] p-2.5"
                      : "space-y-2"
                  }
                >
                  {group.map((c, ci) => (
                    <div key={ci}>
                      {ci > 0 ? (
                        <div className="my-1 flex items-center gap-2">
                          <span className="inline-flex items-center rounded-md border border-[var(--border-color)] bg-[var(--surface-bg)] px-2 py-0.5 font-heading text-[10px] font-bold uppercase tracking-wide text-[var(--text-dim)]">
                            E
                          </span>
                          <span className="h-px flex-1 bg-[var(--border-color)]" />
                        </div>
                      ) : null}
                      <div className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
                        <FilterSelectDropdown
                          creatorField
                          icon={<TrendingDown size={14} />}
                          label="Métrica"
                          placeholder="Métrica"
                          clearable={false}
                          value={c.metric}
                          onChange={(v) => patchCondition(gi, ci, { metric: v as Metric })}
                          options={METRIC_OPTIONS}
                        />
                        <FilterSelectDropdown
                          creatorField
                          icon={<TrendingUp size={14} />}
                          label="Operador"
                          placeholder="Op"
                          clearable={false}
                          value={c.op}
                          onChange={(v) => patchCondition(gi, ci, { op: v as Op })}
                          options={OP_OPTIONS}
                        />
                        <FilterTextField
                          creatorField
                          icon={<Zap size={14} />}
                          label="Valor"
                          value={String(c.value)}
                          onChange={(v) => patchCondition(gi, ci, { value: Number(v) || 0 })}
                          placeholder="0"
                        />
                        {multiClause ? (
                          <button
                            type="button"
                            onClick={() => removeCondition(gi, ci)}
                            className="ds-table-compact-action ds-table-compact-action--danger mb-0.5 flex h-9 w-9 items-center justify-center"
                            title="Remover condição"
                            aria-label="Remover condição"
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {canAddGroup ? (
            <button
              type="button"
              onClick={addGroup}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--border-hover)] px-3 py-1.5 font-heading text-xs font-semibold text-[var(--text-dim)] transition-colors hover:border-[var(--ui-accent)] hover:text-[var(--ui-accent)]"
            >
              <Plus size={14} strokeWidth={2.5} />
              Adicionar grupo (OU)
            </button>
          ) : null}

          <FilterTextField
            creatorField
            icon={<Wallet size={14} />}
            label="Gasto mínimo (R$)"
            value={String(form.minSpend)}
            onChange={(v) => update({ minSpend: Number(v) || 0 })}
            placeholder="0"
            className="mt-3"
          />
          <p className="mt-2 font-body text-[11px] text-[var(--text-dimmer)]">
            O gasto mínimo evita disparos com pouca verba — a regra só age depois de a campanha gastar esse valor.
          </p>
        </div>
      )}
    </div>
  );
}
