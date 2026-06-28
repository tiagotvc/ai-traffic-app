"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Bell, PauseCircle, Plus, Trash2, TrendingDown, TrendingUp, Wallet, Zap } from "lucide-react";

import { PageToolbar } from "@/components/layout/PageToolbar";
import { AppPageShell } from "@/components/layout/AppPageShell";
import { CreatorModalShell } from "@/components/campaign-creator/CreatorModalShell";
import { FilterSelectDropdown } from "@/components/FilterSelectDropdown";
import { FilterTextField } from "@/components/FilterTextField";
import { DsAccentOutlineButton } from "@/design-system";
import { UxAutomationsPageSkeleton } from "@/uxpilot-ui/adapters/ux-skeleton";

const TEMPLATE_ICONS = {
  pause: PauseCircle,
  banknotes: Wallet,
  bell: Bell,
  trendDown: TrendingDown,
  trendUp: TrendingUp,
  clock: Zap
} as const;

const TONE_STYLES: Record<string, { bg: string; color: string }> = {
  rose: { bg: "rgba(239,68,68,0.1)", color: "#ef4444" },
  emerald: { bg: "rgba(16,185,129,0.1)", color: "#10b981" },
  accent: { bg: "var(--ui-accent-muted)", color: "var(--ui-accent)" },
  violet: { bg: "rgba(124,58,237,0.1)", color: "#a78bfa" },
  sky: { bg: "rgba(14,165,233,0.1)", color: "#0ea5e9" }
};

const STEPS = [
  { n: "1", title: "Escolha um gatilho", desc: "Uma condição como CPL acima da meta ou gasto sem conversão." },
  { n: "2", title: "Defina a ação", desc: "Pausar a campanha ou só receber um alerta." },
  { n: "3", title: "Ative e relaxe", desc: "A regra é avaliada a cada sincronização e age sozinha." }
];

type Metric = "cpl" | "spend" | "conversions" | "roas";
type Op = "gt" | "gte" | "lt";
type ActionType = "pause_campaign" | "alert_only" | "adjust_budget_percent";

type RuleForm = {
  name: string;
  metric: Metric;
  op: Op;
  value: number;
  minSpend: number;
  action: ActionType;
  budgetPercent?: number;
};

type Template = {
  iconKey: keyof typeof TEMPLATE_ICONS;
  title: string;
  desc: string;
  ifText: string;
  thenText: string;
  tone: string;
  soon?: boolean;
  form?: RuleForm;
};

const TEMPLATES: Template[] = [
  {
    iconKey: "pause",
    title: "Pausar campanha com CPL alto",
    desc: "Pausa a campanha quando o custo por lead passa da meta.",
    ifText: "CPL > R$ 50 e gasto > R$ 30",
    thenText: "Pausar campanha",
    tone: "rose",
    form: { name: "Pausar campanha com CPL alto", metric: "cpl", op: "gt", value: 50, minSpend: 30, action: "pause_campaign" }
  },
  {
    iconKey: "banknotes",
    title: "Cortar gasto sem retorno",
    desc: "Pausa quando a campanha gasta demais e não entrega.",
    ifText: "Gasto > R$ 100",
    thenText: "Pausar campanha",
    tone: "accent",
    form: { name: "Cortar gasto sem retorno", metric: "spend", op: "gt", value: 100, minSpend: 50, action: "pause_campaign" }
  },
  {
    iconKey: "bell",
    title: "Alerta de CPL alto",
    desc: "Te avisa assim que o custo por lead passa do limite.",
    ifText: "CPL > R$ 40",
    thenText: "Enviar alerta",
    tone: "violet",
    form: { name: "Alerta de CPL alto", metric: "cpl", op: "gt", value: 40, minSpend: 0, action: "alert_only" }
  },
  {
    iconKey: "trendDown",
    title: "Alerta de poucas conversões",
    desc: "Avisa quando a campanha converte abaixo do esperado.",
    ifText: "Conversões < 3 e gasto > R$ 50",
    thenText: "Enviar alerta",
    tone: "sky",
    form: { name: "Alerta de poucas conversões", metric: "conversions", op: "lt", value: 3, minSpend: 50, action: "alert_only" }
  },
  {
    iconKey: "trendUp",
    title: "Escalar vencedores",
    desc: "Aumenta o orçamento das campanhas com bom ROAS.",
    ifText: "ROAS > 3,0",
    thenText: "+10% de orçamento",
    tone: "emerald",
    form: {
      name: "Escalar vencedores",
      metric: "roas",
      op: "gt",
      value: 3,
      minSpend: 100,
      action: "adjust_budget_percent",
      budgetPercent: 10
    }
  },
  {
    iconKey: "clock",
    title: "Pausar fora do horário",
    desc: "Desliga as campanhas fora do horário comercial.",
    ifText: "Fora de 08h–20h",
    thenText: "Pausar / Reativar",
    tone: "sky",
    soon: true
  }
];

type Rule = {
  id: string;
  name: string;
  enabled: boolean;
  condition: { metric?: string; op?: string; value?: number; minSpend?: number };
  action: { type?: string };
  executionCount?: number;
  lastExecutionAt?: string | null;
};

const METRIC_LABEL: Record<string, string> = {
  cpl: "CPL",
  cpa: "CPA",
  ctr: "CTR",
  spend: "Gasto",
  conversions: "Conversões",
  roas: "ROAS"
};

function formatLastRun(iso?: string | null) {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  } catch {
    return null;
  }
}
const OP_LABEL: Record<string, string> = { gt: ">", gte: "≥", lt: "<" };

function actionLabel(type?: string) {
  if (type === "pause_campaign") return "Pausar campanha";
  if (type === "alert_only") return "Enviar alerta";
  if (type === "adjust_budget_percent") return "Ajustar orçamento %";
  return type ?? "—";
}

function conditionText(c: Rule["condition"]) {
  const metric = METRIC_LABEL[c.metric ?? ""] ?? (c.metric ?? "—");
  const op = OP_LABEL[c.op ?? ""] ?? c.op ?? "";
  const extra = c.minSpend ? ` · gasto > R$ ${c.minSpend}` : "";
  return `${metric} ${op} ${c.value ?? "—"}${extra}`;
}

const EMPTY_FORM: RuleForm = {
  name: "",
  metric: "cpl",
  op: "gt",
  value: 50,
  minSpend: 30,
  action: "pause_campaign"
};

export function AutomationsRulesView() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<RuleForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/automation/rules")
      .then((r) => r.json())
      .then((j) => setRules((j.rules ?? []) as Rule[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setError(null);
    setModalOpen(true);
  }
  function openTemplate(tpl: Template) {
    if (!tpl.form) return;
    setForm(tpl.form);
    setError(null);
    setModalOpen(true);
  }

  function save() {
    startTransition(async () => {
      setError(null);
      const res = await fetch("/api/automation/rules", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim() || "Nova regra",
          condition: {
            metric: form.metric,
            op: form.op,
            value: Number(form.value) || 0,
            minSpend: form.minSpend > 0 ? Number(form.minSpend) : undefined
          },
          action: {
            type: form.action,
            ...(form.action === "adjust_budget_percent"
              ? { budgetPercent: form.budgetPercent ?? 10 }
              : {})
          }
        })
      });
      if (!res.ok) {
        setError("Não foi possível salvar a regra.");
        return;
      }
      setModalOpen(false);
      load();
    });
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
          <button type="button" onClick={openCreate} className="ui-btn-accent ui-btn-responsive font-heading font-bold">
            <Plus size={15} />
            <span className="ui-btn-responsive-label">Criar regra</span>
          </button>
        }
      />

      <div className="campaign-creator-card overflow-hidden bg-gradient-to-br from-[var(--ui-accent-muted)] to-[var(--creator-card-bg)] p-6 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
              <Zap size={20} />
            </span>
            <h2 className="mt-3 font-heading text-xl font-bold text-[var(--text-main)] sm:text-2xl">
              Piloto automático para campanhas
            </h2>
            <p className="mt-1 font-body text-sm text-[var(--text-dim)]">
              Pausar o que não funciona e receber alertas quando algo sai do trilho.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {STEPS.map((s) => (
          <div key={s.n} className="campaign-creator-card campaign-creator-card--compact flex items-start gap-3 !space-y-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] text-sm font-bold text-[var(--ui-accent)]">
              {s.n}
            </div>
            <div>
              <div className="font-heading text-sm font-semibold text-[var(--text-main)]">
                {s.title}
              </div>
              <p className="mt-0.5 font-body text-xs text-[var(--text-dim)]">
                {s.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="campaign-creator-orion-section-label">Modelos de regra</h3>
          <span className="font-body text-xs text-[var(--text-dimmer)]">
            Comece a partir de um modelo pronto
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((tpl) => {
            const IconCmp = TEMPLATE_ICONS[tpl.iconKey];
            const tone = TONE_STYLES[tpl.tone] ?? TONE_STYLES.violet;
            return (
              <div key={tpl.title} className="campaign-creator-card campaign-creator-card--compact flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: tone.bg, color: tone.color }}
                  >
                    <IconCmp size={18} />
                  </div>
                  <div className="flex-1 font-heading text-sm font-semibold text-[var(--text-main)]">
                    {tpl.title}
                  </div>
                  {tpl.soon ? (
                    <span className="ds-table-compact-badge ds-table-compact-badge--neutral">
                      Em breve
                    </span>
                  ) : null}
                </div>
                <p className="font-body text-sm text-[var(--text-dim)]">
                  {tpl.desc}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 font-body text-[11px]">
                  <span className="rounded-md border border-[var(--creator-card-border)] bg-[var(--creator-card-bg-inset)] px-2 py-1 font-medium text-[var(--text-dim)]">
                    SE {tpl.ifText}
                  </span>
                  <span className="text-[var(--text-dimmer)]">→</span>
                  <span className="rounded-md border border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] px-2 py-1 font-medium text-[var(--ui-accent)]">
                    {tpl.thenText}
                  </span>
                </div>
                <DsAccentOutlineButton
                  type="button"
                  disabled={tpl.soon}
                  onClick={() => openTemplate(tpl)}
                  className="mt-auto w-full justify-center py-2 text-sm"
                >
                  {tpl.soon ? "Em breve" : "Usar modelo"}
                </DsAccentOutlineButton>
              </div>
            );
          })}

          <button
            type="button"
            onClick={openCreate}
            className="campaign-creator-copy-card campaign-creator-copy-card--lead flex min-h-[180px] flex-col items-center justify-center gap-2 p-4"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--creator-card-bg-inset)] text-[var(--text-dim)]">
              <Plus size={20} />
            </span>
            <span className="font-heading text-sm font-semibold text-[var(--text-main)]">Criar regra personalizada</span>
            <span className="font-body text-xs text-[var(--text-dim)]">Monte sua própria condição e ação</span>
          </button>
        </div>
      </div>

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
              Use um modelo acima ou crie a sua. As regras são avaliadas a cada sincronização.
            </p>
          </div>
        ) : (
          <div className="ui-campaign-table-shell ui-campaign-table-shell--compact overflow-hidden">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="flex flex-wrap items-center gap-3 border-b border-[var(--creator-card-border)] p-4 last:border-0"
              >
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
                  <p className="mt-1.5 font-body text-[11px] text-[var(--text-dimmer)]">
                    {rule.executionCount && rule.executionCount > 0
                      ? `${rule.executionCount} execução(ões)${
                          formatLastRun(rule.lastExecutionAt) ? ` · última ${formatLastRun(rule.lastExecutionAt)}` : ""
                        }`
                      : "Ainda não disparou"}
                  </p>
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
            ))}
          </div>
        )}
      </div>

      <CreatorModalShell
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nova regra"
        width="md"
        onCancel={() => setModalOpen(false)}
        onPrimary={save}
        primaryLabel="Salvar regra"
        primaryLoading={isPending}
        primaryDisabled={isPending}
      >
        <div className="space-y-3">
          <FilterTextField
            creatorField
            icon={<Zap size={14} />}
            label="Nome"
            value={form.name}
            onChange={(v) => setForm((f) => ({ ...f, name: v }))}
            placeholder="Ex.: Pausar CPL alto"
          />

          <div>
            <p className="campaign-creator-orion-section-label mb-1.5">Condição (SE)</p>
            <div className="grid grid-cols-3 gap-2">
              <FilterSelectDropdown
                creatorField
                icon={<TrendingDown size={14} />}
                label="Métrica"
                placeholder="Métrica"
                clearable={false}
                value={form.metric}
                onChange={(v) => setForm((f) => ({ ...f, metric: v as Metric }))}
                options={[
                  { value: "cpl", label: "CPL" },
                  { value: "spend", label: "Gasto" },
                  { value: "conversions", label: "Conversões" },
                  { value: "roas", label: "ROAS" }
                ]}
              />
              <FilterSelectDropdown
                creatorField
                icon={<TrendingUp size={14} />}
                label="Operador"
                placeholder="Op"
                clearable={false}
                value={form.op}
                onChange={(v) => setForm((f) => ({ ...f, op: v as Op }))}
                options={[
                  { value: "gt", label: ">" },
                  { value: "gte", label: "≥" },
                  { value: "lt", label: "<" }
                ]}
              />
              <FilterTextField
                creatorField
                icon={<Zap size={14} />}
                label="Valor"
                value={String(form.value)}
                onChange={(v) => setForm((f) => ({ ...f, value: Number(v) || 0 }))}
                placeholder="0"
              />
            </div>
          </div>

          <FilterTextField
            creatorField
            icon={<Wallet size={14} />}
            label="Gasto mínimo (R$)"
            value={String(form.minSpend)}
            onChange={(v) => setForm((f) => ({ ...f, minSpend: Number(v) || 0 }))}
            placeholder="0"
          />

          <FilterSelectDropdown
            creatorField
            icon={<Bell size={14} />}
            label="Ação (ENTÃO)"
            placeholder="Ação"
            clearable={false}
            value={form.action}
            onChange={(v) => setForm((f) => ({ ...f, action: v as ActionType }))}
            options={[
              { value: "pause_campaign", label: "Pausar campanha" },
              { value: "alert_only", label: "Enviar alerta" },
              { value: "adjust_budget_percent", label: "Ajustar orçamento (%)" }
            ]}
          />

          {form.action === "adjust_budget_percent" ? (
            <FilterTextField
              creatorField
              icon={<TrendingUp size={14} />}
              label="Aumento de orçamento (%)"
              value={String(form.budgetPercent ?? 10)}
              onChange={(v) => setForm((f) => ({ ...f, budgetPercent: Number(v) || 10 }))}
              placeholder="10"
            />
          ) : null}

          {error ? <p className="font-body text-xs text-rose-600">{error}</p> : null}
        </div>
      </CreatorModalShell>
      </div>
    </AppPageShell>
  );
}
