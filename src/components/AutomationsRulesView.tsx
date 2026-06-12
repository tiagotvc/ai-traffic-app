"use client";

// Tela "Regras automáticas" — VISUAL apenas (inspirada no Birch). Sem função ainda.

const STEPS = [
  { n: "1", title: "Escolha um gatilho", desc: "Uma condição como CPA acima da meta ou ROAS abaixo do alvo." },
  { n: "2", title: "Defina a ação", desc: "Pausar, ajustar orçamento ou só receber um alerta." },
  { n: "3", title: "Ative e relaxe", desc: "A regra roda sozinha e otimiza suas campanhas 24/7." }
];

const TEMPLATES = [
  {
    icon: "🛑",
    title: "Pausar anúncios ruins",
    desc: "Pausa automaticamente anúncios com custo por resultado acima da meta.",
    ifText: "CPA > R$ 50 e gasto > R$ 30",
    thenText: "Pausar anúncio",
    tone: "rose"
  },
  {
    icon: "🚀",
    title: "Escalar vencedores",
    desc: "Aumenta o orçamento das campanhas que estão performando bem.",
    ifText: "ROAS > 3,0",
    thenText: "+20% de orçamento",
    tone: "emerald"
  },
  {
    icon: "💸",
    title: "Controlar o gasto",
    desc: "Corta o desperdício quando há gasto sem nenhuma conversão.",
    ifText: "Gasto > R$ 100 e 0 conversões",
    thenText: "Pausar campanha",
    tone: "amber"
  },
  {
    icon: "🔔",
    title: "Alerta de CPL alto",
    desc: "Te avisa assim que o custo por lead passa do limite.",
    ifText: "CPL > R$ 40",
    thenText: "Enviar alerta",
    tone: "violet"
  },
  {
    icon: "📉",
    title: "Reduzir desperdício",
    desc: "Diminui o orçamento de conjuntos que estão caros demais.",
    ifText: "CPA > meta por 3 dias",
    thenText: "−20% de orçamento",
    tone: "amber"
  },
  {
    icon: "⏰",
    title: "Pausar fora do horário",
    desc: "Desliga as campanhas fora do horário comercial e religa de manhã.",
    ifText: "Fora de 08h–20h",
    thenText: "Pausar / Reativar",
    tone: "sky"
  }
] as const;

const TONES: Record<string, string> = {
  rose: "bg-rose-50 text-rose-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  violet: "bg-violet-50 text-violet-600",
  sky: "bg-sky-50 text-sky-600"
};

export function AutomationsRulesView() {
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
            <span className="inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-medium">
              Em breve
            </span>
            <h2 className="mt-2 text-xl font-bold sm:text-2xl">
              Vamos otimizar suas campanhas 🚀
            </h2>
            <p className="mt-1 text-sm text-white/80">
              Deixe o piloto automático cuidar do trabalho repetitivo: pausar o que não
              funciona, escalar o que está dando certo e te avisar quando algo sai do trilho.
            </p>
          </div>
          <button
            type="button"
            className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 shadow-sm transition hover:bg-violet-50"
          >
            + Criar regra
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
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl ${
                    TONES[tpl.tone] ?? "bg-slate-100"
                  }`}
                >
                  {tpl.icon}
                </div>
                <div className="font-semibold text-slate-900">{tpl.title}</div>
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
              <button type="button" className="ui-btn-secondary mt-auto text-sm">
                Usar modelo
              </button>
            </div>
          ))}

          {/* Criar personalizada */}
          <button
            type="button"
            className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 p-4 text-slate-400 transition hover:border-violet-300 hover:text-violet-600"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-xl">
              +
            </span>
            <span className="text-sm font-semibold">Criar regra personalizada</span>
            <span className="text-xs">Monte sua própria condição e ação</span>
          </button>
        </div>
      </div>

      {/* Regras ativas (vazio, ilustrativo) */}
      <div className="ui-card p-8 text-center">
        <div className="text-2xl">⚙️</div>
        <div className="mt-2 text-sm font-semibold text-slate-800">Nenhuma regra ativa ainda</div>
        <p className="mt-1 text-xs text-slate-500">
          Quando você ativar uma regra, ela aparece aqui com o histórico de ações.
        </p>
      </div>
    </div>
  );
}
