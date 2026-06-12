"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import { Badge } from "@/components/ui/Badge";

function Icon({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const ICONS = {
  bolt: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z",
  pause: "M14.25 9v6m-4.5 0V9M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  trendUp:
    "M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941",
  trendDown:
    "M2.25 6L9 12.75l4.286-4.286a11.95 11.95 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181",
  banknotes:
    "M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z",
  bell: "M14.857 17.082a23.85 23.85 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0",
  clock: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
  plus: "M12 4.5v15m7.5-7.5h-15",
  trash:
    "M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
} as const;

const TONES: Record<string, string> = {
  rose: "bg-rose-50 text-rose-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  violet: "bg-violet-50 text-violet-600",
  sky: "bg-sky-50 text-sky-600"
};

const STEPS = [
  { n: "1", title: "Escolha um gatilho", desc: "Uma condição como CPL acima da meta ou gasto sem conversão." },
  { n: "2", title: "Defina a ação", desc: "Pausar a campanha ou só receber um alerta." },
  { n: "3", title: "Ative e relaxe", desc: "A regra é avaliada a cada sincronização e age sozinha." }
];

type Metric = "cpl" | "spend" | "conversions";
type Op = "gt" | "gte" | "lt";
type ActionType = "pause_campaign" | "alert_only";

type RuleForm = {
  name: string;
  metric: Metric;
  op: Op;
  value: number;
  minSpend: number;
  action: ActionType;
};

type Template = {
  icon: string;
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
    icon: ICONS.pause,
    title: "Pausar campanha com CPL alto",
    desc: "Pausa a campanha quando o custo por lead passa da meta.",
    ifText: "CPL > R$ 50 e gasto > R$ 30",
    thenText: "Pausar campanha",
    tone: "rose",
    form: { name: "Pausar campanha com CPL alto", metric: "cpl", op: "gt", value: 50, minSpend: 30, action: "pause_campaign" }
  },
  {
    icon: ICONS.banknotes,
    title: "Cortar gasto sem retorno",
    desc: "Pausa quando a campanha gasta demais e não entrega.",
    ifText: "Gasto > R$ 100",
    thenText: "Pausar campanha",
    tone: "amber",
    form: { name: "Cortar gasto sem retorno", metric: "spend", op: "gt", value: 100, minSpend: 50, action: "pause_campaign" }
  },
  {
    icon: ICONS.bell,
    title: "Alerta de CPL alto",
    desc: "Te avisa assim que o custo por lead passa do limite.",
    ifText: "CPL > R$ 40",
    thenText: "Enviar alerta",
    tone: "violet",
    form: { name: "Alerta de CPL alto", metric: "cpl", op: "gt", value: 40, minSpend: 0, action: "alert_only" }
  },
  {
    icon: ICONS.trendDown,
    title: "Alerta de poucas conversões",
    desc: "Avisa quando a campanha converte abaixo do esperado.",
    ifText: "Conversões < 3 e gasto > R$ 50",
    thenText: "Enviar alerta",
    tone: "sky",
    form: { name: "Alerta de poucas conversões", metric: "conversions", op: "lt", value: 3, minSpend: 50, action: "alert_only" }
  },
  {
    icon: ICONS.trendUp,
    title: "Escalar vencedores",
    desc: "Aumenta o orçamento das campanhas com bom ROAS.",
    ifText: "ROAS > 3,0",
    thenText: "+20% de orçamento",
    tone: "emerald",
    soon: true
  },
  {
    icon: ICONS.clock,
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
};

const METRIC_LABEL: Record<string, string> = { cpl: "CPL", spend: "Gasto", conversions: "Conversões" };
const OP_LABEL: Record<string, string> = { gt: ">", gte: "≥", lt: "<" };

function actionLabel(type?: string) {
  if (type === "pause_campaign") return "Pausar campanha";
  if (type === "alert_only") return "Enviar alerta";
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
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<RuleForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(() => {
    fetch("/api/automation/rules")
      .then((r) => r.json())
      .then((j) => setRules((j.rules ?? []) as Rule[]))
      .catch(() => {});
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
          action: { type: form.action }
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

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium text-slate-500">Otimização</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Regras automáticas</h1>
        <p className="mt-1 text-sm text-slate-500">
          Crie regras que monitoram e otimizam suas campanhas automaticamente.
        </p>
      </div>

      {/* Hero */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-violet-500 p-6 text-white shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
              <Icon d={ICONS.bolt} className="h-5 w-5" />
            </span>
            <h2 className="mt-3 text-xl font-bold sm:text-2xl">Vamos otimizar suas campanhas</h2>
            <p className="mt-1 text-sm text-white/80">
              Deixe o piloto automático cuidar do trabalho repetitivo: pausar o que não
              funciona e te avisar quando algo sai do trilho.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 shadow-sm transition hover:bg-violet-50"
          >
            <Icon d={ICONS.plus} className="h-4 w-4" />
            Criar regra
          </button>
        </div>
      </div>

      {/* Como funciona */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {STEPS.map((s) => (
          <div key={s.n} className="ui-card flex items-start gap-3 p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
              {s.n}
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">{s.title}</div>
              <p className="mt-0.5 text-xs text-slate-500">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Modelos */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Modelos de regra</h3>
          <span className="text-xs text-slate-400">Comece a partir de um modelo pronto</span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((tpl) => (
            <div key={tpl.title} className="ui-card flex flex-col gap-3 p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${TONES[tpl.tone]}`}>
                  <Icon d={tpl.icon} className="h-5 w-5" />
                </div>
                <div className="flex-1 font-semibold text-slate-900">{tpl.title}</div>
                {tpl.soon ? (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                    Em breve
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-slate-500">{tpl.desc}</p>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-600">
                  SE {tpl.ifText}
                </span>
                <span className="text-slate-300">→</span>
                <span className="rounded-md bg-violet-50 px-2 py-1 font-medium text-violet-700">
                  {tpl.thenText}
                </span>
              </div>
              <button
                type="button"
                disabled={tpl.soon}
                onClick={() => openTemplate(tpl)}
                className="ui-btn-secondary mt-auto text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                {tpl.soon ? "Em breve" : "Usar modelo"}
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={openCreate}
            className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 p-4 text-slate-400 transition hover:border-violet-300 hover:text-violet-600"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <Icon d={ICONS.plus} className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold">Criar regra personalizada</span>
            <span className="text-xs">Monte sua própria condição e ação</span>
          </button>
        </div>
      </div>

      {/* Regras criadas */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-800">
          Suas regras {rules.length ? `(${rules.length})` : ""}
        </h3>
        {rules.length === 0 ? (
          <div className="ui-card p-8 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Icon d={ICONS.bell} className="h-6 w-6" />
            </span>
            <div className="mt-3 text-sm font-semibold text-slate-800">Nenhuma regra ainda</div>
            <p className="mt-1 text-xs text-slate-500">
              Use um modelo acima ou crie a sua. As regras são avaliadas a cada sincronização.
            </p>
          </div>
        ) : (
          <div className="ui-card divide-y divide-slate-100 overflow-hidden">
            {rules.map((rule) => (
              <div key={rule.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{rule.name}</span>
                    <Badge variant={rule.enabled ? "success" : "neutral"}>
                      {rule.enabled ? "Ativa" : "Pausada"}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-600">
                      SE {conditionText(rule.condition)}
                    </span>
                    <span className="text-slate-300">→</span>
                    <span className="rounded-md bg-violet-50 px-2 py-1 font-medium text-violet-700">
                      {actionLabel(rule.action.type)}
                    </span>
                  </div>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-500">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    disabled={isPending}
                    onChange={() => toggle(rule)}
                    className="accent-violet-600"
                  />
                  Ativa
                </label>
                <button
                  type="button"
                  onClick={() => remove(rule)}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                  title="Excluir"
                >
                  <Icon d={ICONS.trash} className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal criar/editar */}
      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          onMouseDown={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Nova regra</h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-xs font-medium text-slate-600">Nome</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex.: Pausar CPL alto"
                  className="ui-input mt-1 w-full"
                />
              </label>

              <div>
                <span className="text-xs font-medium text-slate-600">Condição (SE)</span>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  <select
                    value={form.metric}
                    onChange={(e) => setForm((f) => ({ ...f, metric: e.target.value as Metric }))}
                    className="ui-input"
                  >
                    <option value="cpl">CPL</option>
                    <option value="spend">Gasto</option>
                    <option value="conversions">Conversões</option>
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
                <span className="text-xs font-medium text-slate-600">Gasto mínimo (R$) — opcional</span>
                <input
                  type="number"
                  value={form.minSpend}
                  onChange={(e) => setForm((f) => ({ ...f, minSpend: Number(e.target.value) }))}
                  placeholder="0"
                  className="ui-input mt-1 w-full"
                />
                <span className="mt-1 block text-[11px] text-slate-400">
                  Só age se a campanha já gastou pelo menos esse valor (evita agir cedo demais).
                </span>
              </label>

              <label className="block">
                <span className="text-xs font-medium text-slate-600">Ação (ENTÃO)</span>
                <select
                  value={form.action}
                  onChange={(e) => setForm((f) => ({ ...f, action: e.target.value as ActionType }))}
                  className="ui-input mt-1 w-full"
                >
                  <option value="pause_campaign">Pausar campanha</option>
                  <option value="alert_only">Enviar alerta</option>
                </select>
              </label>

              {error ? <p className="text-xs text-rose-600">{error}</p> : null}
              <p className="text-[11px] text-slate-400">
                A regra é avaliada a cada sincronização, sobre os últimos 7 dias, e vale para
                todos os clientes.
              </p>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setModalOpen(false)} className="ui-btn-secondary text-sm">
                Cancelar
              </button>
              <button type="button" disabled={isPending} onClick={save} className="ui-btn-primary text-sm disabled:opacity-60">
                Salvar regra
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
