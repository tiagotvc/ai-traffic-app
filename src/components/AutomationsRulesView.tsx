"use client";

// Tela "Regras automáticas" — VISUAL apenas (inspirada no Birch). Sem função ainda.

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
  cog: "M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.49l1.216.455c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281zM15 12a3 3 0 11-6 0 3 3 0 016 0z"
} as const;

const STEPS = [
  { n: "1", title: "Escolha um gatilho", desc: "Uma condição como CPA acima da meta ou ROAS abaixo do alvo." },
  { n: "2", title: "Defina a ação", desc: "Pausar, ajustar orçamento ou só receber um alerta." },
  { n: "3", title: "Ative e relaxe", desc: "A regra roda sozinha e otimiza suas campanhas 24/7." }
];

const TEMPLATES = [
  {
    icon: ICONS.pause,
    title: "Pausar anúncios ruins",
    desc: "Pausa automaticamente anúncios com custo por resultado acima da meta.",
    ifText: "CPA > R$ 50 e gasto > R$ 30",
    thenText: "Pausar anúncio",
    tone: "rose"
  },
  {
    icon: ICONS.trendUp,
    title: "Escalar vencedores",
    desc: "Aumenta o orçamento das campanhas que estão performando bem.",
    ifText: "ROAS > 3,0",
    thenText: "+20% de orçamento",
    tone: "emerald"
  },
  {
    icon: ICONS.banknotes,
    title: "Controlar o gasto",
    desc: "Corta o desperdício quando há gasto sem nenhuma conversão.",
    ifText: "Gasto > R$ 100 e 0 conversões",
    thenText: "Pausar campanha",
    tone: "amber"
  },
  {
    icon: ICONS.bell,
    title: "Alerta de CPL alto",
    desc: "Te avisa assim que o custo por lead passa do limite.",
    ifText: "CPL > R$ 40",
    thenText: "Enviar alerta",
    tone: "violet"
  },
  {
    icon: ICONS.trendDown,
    title: "Reduzir desperdício",
    desc: "Diminui o orçamento de conjuntos que estão caros demais.",
    ifText: "CPA > meta por 3 dias",
    thenText: "−20% de orçamento",
    tone: "amber"
  },
  {
    icon: ICONS.clock,
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
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <Icon d={ICONS.bolt} className="h-5 w-5" />
              </span>
              <span className="inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-medium">
                Em breve
              </span>
            </div>
            <h2 className="mt-3 text-xl font-bold sm:text-2xl">Vamos otimizar suas campanhas</h2>
            <p className="mt-1 text-sm text-white/80">
              Deixe o piloto automático cuidar do trabalho repetitivo: pausar o que não
              funciona, escalar o que está dando certo e te avisar quando algo sai do trilho.
            </p>
          </div>
          <button
            type="button"
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
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    TONES[tpl.tone] ?? "bg-slate-100 text-slate-500"
                  }`}
                >
                  <Icon d={tpl.icon} className="h-5 w-5" />
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
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <Icon d={ICONS.plus} className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold">Criar regra personalizada</span>
            <span className="text-xs">Monte sua própria condição e ação</span>
          </button>
        </div>
      </div>

      {/* Regras ativas (vazio, ilustrativo) */}
      <div className="ui-card p-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <Icon d={ICONS.cog} className="h-6 w-6" />
        </span>
        <div className="mt-3 text-sm font-semibold text-slate-800">Nenhuma regra ativa ainda</div>
        <p className="mt-1 text-xs text-slate-500">
          Quando você ativar uma regra, ela aparece aqui com o histórico de ações.
        </p>
      </div>
    </div>
  );
}
