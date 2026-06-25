"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Bell, PauseCircle, Plus, Trash2, TrendingDown, TrendingUp, Wallet, Zap } from "lucide-react";

import { PageToolbar } from "@/components/layout/PageToolbar";
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
  amber: { bg: "rgba(245,166,35,0.1)", color: "#f5a623" },
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
    tone: "amber",
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

  const cardStyle = {
    background: "var(--surface-card)",
    borderColor: "var(--border-color)"
  };

  return (
    <main
      className="flex-1 space-y-5 overflow-y-auto px-4 py-5 md:px-6"
      style={{ scrollbarWidth: "thin", scrollbarColor: "var(--scrollbar-color) transparent" }}
    >
      <PageToolbar
        icon={<Zap size={16} style={{ color: "#f5a623" }} />}
        title="Automações"
        subtitle="Crie regras se-então para pausar, alertar ou escalar campanhas conforme a performance."
        showGlobalFilters={false}
        showSync={false}
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 font-heading text-sm font-bold shadow-lg transition-all hover:brightness-110"
            style={{ background: "linear-gradient(135deg, #f5a623, #e8920d)", color: "#0f1419" }}
          >
            <Plus size={15} />
            Criar regra
          </button>
        }
      />

      <div
        className="overflow-hidden rounded-xl border p-6 sm:p-8"
        style={{ ...cardStyle, background: "linear-gradient(135deg, rgba(79,70,229,0.15), rgba(124,58,237,0.08))" }}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: "rgba(245,166,35,0.15)" }}
            >
              <Zap size={20} style={{ color: "#f5a623" }} />
            </span>
            <h2 className="mt-3 font-heading text-xl font-bold sm:text-2xl" style={{ color: "var(--text-main)" }}>
              Piloto automático para campanhas
            </h2>
            <p className="mt-1 font-body text-sm" style={{ color: "var(--text-dim)" }}>
              Pausar o que não funciona e receber alertas quando algo sai do trilho.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {STEPS.map((s) => (
          <div key={s.n} className="flex items-start gap-3 rounded-xl border p-4" style={cardStyle}>
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
              style={{ background: "rgba(245,166,35,0.12)", color: "#f5a623" }}
            >
              {s.n}
            </div>
            <div>
              <div className="font-heading text-sm font-semibold" style={{ color: "var(--text-main)" }}>
                {s.title}
              </div>
              <p className="mt-0.5 font-body text-xs" style={{ color: "var(--text-dim)" }}>
                {s.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-heading text-sm font-semibold" style={{ color: "var(--text-main)" }}>
            Modelos de regra
          </h3>
          <span className="font-body text-xs" style={{ color: "var(--text-dimmer)" }}>
            Comece a partir de um modelo pronto
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((tpl) => {
            const IconCmp = TEMPLATE_ICONS[tpl.iconKey];
            const tone = TONE_STYLES[tpl.tone] ?? TONE_STYLES.violet;
            return (
              <div key={tpl.title} className="flex flex-col gap-3 rounded-xl border p-4" style={cardStyle}>
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: tone.bg, color: tone.color }}
                  >
                    <IconCmp size={18} />
                  </div>
                  <div className="flex-1 font-heading text-sm font-semibold" style={{ color: "var(--text-main)" }}>
                    {tpl.title}
                  </div>
                  {tpl.soon ? (
                    <span
                      className="rounded-full px-2 py-0.5 font-body text-[10px]"
                      style={{ background: "var(--surface-bg)", color: "var(--text-dim)" }}
                    >
                      Em breve
                    </span>
                  ) : null}
                </div>
                <p className="font-body text-sm" style={{ color: "var(--text-dim)" }}>
                  {tpl.desc}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 font-body text-[11px]">
                  <span
                    className="rounded-md px-2 py-1 font-medium"
                    style={{ background: "var(--surface-bg)", color: "var(--text-dim)" }}
                  >
                    SE {tpl.ifText}
                  </span>
                  <span style={{ color: "var(--text-dimmer)" }}>→</span>
                  <span
                    className="rounded-md px-2 py-1 font-medium"
                    style={{ background: "rgba(124,58,237,0.08)", color: "#a78bfa" }}
                  >
                    {tpl.thenText}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={tpl.soon}
                  onClick={() => openTemplate(tpl)}
                  className="mt-auto rounded-lg border px-3 py-2 font-heading text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ borderColor: "var(--border-color)", color: "var(--text-dim)", background: "var(--surface-bg)" }}
                >
                  {tpl.soon ? "Em breve" : "Usar modelo"}
                </button>
              </div>
            );
          })}

          <button
            type="button"
            onClick={openCreate}
            className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 transition-all"
            style={{ borderColor: "var(--border-hover)", color: "var(--text-dimmer)" }}
          >
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: "var(--surface-bg)", color: "var(--text-dim)" }}
            >
              <Plus size={20} />
            </span>
            <span className="font-heading text-sm font-semibold">Criar regra personalizada</span>
            <span className="font-body text-xs">Monte sua própria condição e ação</span>
          </button>
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-heading text-sm font-semibold" style={{ color: "var(--text-main)" }}>
          Suas regras {rules.length ? `(${rules.length})` : ""}
        </h3>
        {rules.length === 0 ? (
          <div className="rounded-xl border p-8 text-center" style={cardStyle}>
            <span
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{ background: "var(--surface-bg)", color: "var(--text-dimmer)" }}
            >
              <Bell size={24} />
            </span>
            <div className="mt-3 font-heading text-sm font-semibold" style={{ color: "var(--text-main)" }}>
              Nenhuma regra ainda
            </div>
            <p className="mt-1 font-body text-xs" style={{ color: "var(--text-dim)" }}>
              Use um modelo acima ou crie a sua. As regras são avaliadas a cada sincronização.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border" style={cardStyle}>
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="flex flex-wrap items-center gap-3 border-b p-4 last:border-0"
                style={{ borderColor: "var(--border-color)" }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-heading text-sm font-semibold" style={{ color: "var(--text-main)" }}>
                      {rule.name}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 font-body text-[10px] font-semibold"
                      style={{
                        background: rule.enabled ? "rgba(16,185,129,0.12)" : "var(--surface-bg)",
                        color: rule.enabled ? "#10b981" : "var(--text-dim)"
                      }}
                    >
                      {rule.enabled ? "Ativa" : "Pausada"}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 font-body text-[11px]">
                    <span
                      className="rounded-md px-2 py-1 font-medium"
                      style={{ background: "var(--surface-bg)", color: "var(--text-dim)" }}
                    >
                      SE {conditionText(rule.condition)}
                    </span>
                    <span style={{ color: "var(--text-dimmer)" }}>→</span>
                    <span
                      className="rounded-md px-2 py-1 font-medium"
                      style={{ background: "rgba(124,58,237,0.08)", color: "#a78bfa" }}
                    >
                      {actionLabel(rule.action.type)}
                    </span>
                  </div>
                  {/* Logs de execução (derivados dos Alertas gerados pelo motor) */}
                  <p className="mt-1.5 font-body text-[11px]" style={{ color: "var(--text-dimmer)" }}>
                    {rule.executionCount && rule.executionCount > 0
                      ? `${rule.executionCount} execução(ões)${
                          formatLastRun(rule.lastExecutionAt) ? ` · última ${formatLastRun(rule.lastExecutionAt)}` : ""
                        }`
                      : "Ainda não disparou"}
                  </p>
                </div>
                <label className="flex cursor-pointer items-center gap-2 font-body text-xs" style={{ color: "var(--text-dim)" }}>
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    disabled={isPending}
                    onChange={() => toggle(rule)}
                    className="accent-[#f5a623]"
                  />
                  Ativa
                </label>
                <button
                  type="button"
                  onClick={() => remove(rule)}
                  className="rounded-lg p-1.5 transition hover:bg-[rgba(239,68,68,0.08)]"
                  style={{ color: "var(--text-dimmer)" }}
                  title="Excluir"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onMouseDown={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border p-5 shadow-2xl"
            style={cardStyle}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-sm font-semibold" style={{ color: "var(--text-main)" }}>
                Nova regra
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 font-body text-sm"
                style={{ color: "var(--text-dimmer)" }}
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="font-body text-xs font-medium" style={{ color: "var(--text-dim)" }}>
                  Nome
                </span>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex.: Pausar CPL alto"
                  className="ui-input mt-1 w-full"
                />
              </label>

              <div>
                <span className="font-body text-xs font-medium" style={{ color: "var(--text-dim)" }}>
                  Condição (SE)
                </span>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  <select
                    value={form.metric}
                    onChange={(e) => setForm((f) => ({ ...f, metric: e.target.value as Metric }))}
                    className="ui-input"
                  >
                    <option value="cpl">CPL</option>
                    <option value="spend">Gasto</option>
                    <option value="conversions">Conversões</option>
                    <option value="roas">ROAS</option>
                  </select>
                  <select
                    value={form.op}
                    onChange={(e) => setForm((f) => ({ ...f, op: e.target.value as Op }))}
                    className="ui-input"
                  >
                    <option value="gt">&gt;</option>
                    <option value="gte">≥</option>
                    <option value="lt">&lt;</option>
                  </select>
                  <input
                    type="number"
                    value={form.value}
                    onChange={(e) => setForm((f) => ({ ...f, value: Number(e.target.value) }))}
                    className="ui-input"
                  />
                </div>
              </div>

              <label className="block">
                <span className="font-body text-xs font-medium" style={{ color: "var(--text-dim)" }}>
                  Gasto mínimo (R$) — opcional
                </span>
                <input
                  type="number"
                  value={form.minSpend}
                  onChange={(e) => setForm((f) => ({ ...f, minSpend: Number(e.target.value) }))}
                  placeholder="0"
                  className="ui-input mt-1 w-full"
                />
              </label>

              <label className="block">
                <span className="font-body text-xs font-medium" style={{ color: "var(--text-dim)" }}>
                  Ação (ENTÃO)
                </span>
                <select
                  value={form.action}
                  onChange={(e) => setForm((f) => ({ ...f, action: e.target.value as ActionType }))}
                  className="ui-input mt-1 w-full"
                >
                  <option value="pause_campaign">Pausar campanha</option>
                  <option value="alert_only">Enviar alerta</option>
                  <option value="adjust_budget_percent">Ajustar orçamento (%)</option>
                </select>
              </label>

              {form.action === "adjust_budget_percent" ? (
                <label className="block">
                  <span className="font-body text-xs font-medium" style={{ color: "var(--text-dim)" }}>
                    Aumento de orçamento (%)
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={form.budgetPercent ?? 10}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, budgetPercent: Number(e.target.value) || 10 }))
                    }
                    className="ui-input mt-1 w-full"
                  />
                </label>
              ) : null}

              {error ? <p className="font-body text-xs text-rose-600">{error}</p> : null}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg border px-4 py-2 font-heading text-sm font-semibold"
                style={{ borderColor: "var(--border-color)", color: "var(--text-dim)" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={save}
                className="rounded-lg px-4 py-2 font-heading text-sm font-bold disabled:opacity-60"
                style={{ background: "#f5a623", color: "#0f1419" }}
              >
                Salvar regra
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
