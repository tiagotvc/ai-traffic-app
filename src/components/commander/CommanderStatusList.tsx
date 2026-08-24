"use client";

import {
  Brain,
  FlaskConical,
  Gauge,
  Lightbulb,
  MapPin,
  Megaphone,
  ShieldCheck,
  TrendingUp,
  Users,
  Zap
} from "lucide-react";

import type { ResolvedMap } from "./useCommanderPreferences";

export type StatusRow = {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  tone?: string;
};

export const CAPABILITY_ROWS: StatusRow[] = [
  {
    id: "commander.modules.campaigns",
    label: "Criador de campanha",
    description: "Painel do Commander na sidebar do criador (chat, pipeline, insights).",
    icon: <Megaphone size={15} />
  },
  {
    id: "commander.modules.audiences",
    label: "Criadores de público",
    description: "Insights e recomendações nos criadores de persona e zona.",
    icon: <Users size={15} />
  },
  {
    id: "commander.memory",
    label: "Memória e benchmarks",
    description: "Histórico real das suas campanhas entra no contexto do chat.",
    icon: <Brain size={15} />
  },
  {
    id: "commander.parametersContext",
    label: "Metas no contexto do chat",
    description: "CPA alvo, ROAS mínimo e demais metas do cliente entram na conversa.",
    icon: <Gauge size={15} />
  },
  {
    id: "commander.ruleProposals",
    label: "Propostas de regra por conversa",
    description: "“Crie uma regra que…” vira proposta com simulação de 30 dias.",
    icon: <Zap size={15} />
  }
];

export const SCIENTIST_ROWS: StatusRow[] = [
  {
    id: "commander.scientists.competitor",
    label: "Marketing Scientist",
    description:
      "Analisa anúncios reais de concorrentes na Meta Ad Library — hooks, ofertas e ângulos que já " +
      "provaram funcionar (anúncios rodando há mais tempo = mais validados). Aponta o que está saturado " +
      "e onde há espaço pra se diferenciar.",
    icon: <FlaskConical size={15} />,
    tone: "bg-orange-500/15 text-orange-400"
  },
  {
    id: "commander.scientists.geo",
    label: "Geo Scientist",
    description:
      "Cruza os lugares e raios da sua segmentação com o briefing geográfico: aponta bairros fora do " +
      "perfil buscado, sobreposição de público entre pins (verba duplicada) e sugere lugares que faltam.",
    icon: <MapPin size={15} />,
    tone: "bg-sky-500/15 text-sky-400"
  },
  {
    id: "commander.scientists.consumer",
    label: "Consumer Scientist",
    description:
      "Pesquisa as dúvidas e buscas reais do seu público e traduz em objeções que travam a compra, " +
      "motivações de decisão e a linguagem que as pessoas realmente usam — útil pra copy.",
    icon: <Users size={15} />,
    tone: "bg-pink-500/15 text-pink-400"
  },
  {
    id: "commander.scientists.trend",
    label: "Trend Scientist",
    description:
      "Monitora buscas em alta no seu nicho (Google Trends) pra detectar ângulos emergentes pra " +
      "explorar agora e sinais de timing: entrar já ou esperar.",
    icon: <TrendingUp size={15} />,
    tone: "bg-emerald-500/15 text-emerald-400"
  },
  {
    id: "commander.scientists.testing",
    label: "Testing Scientist",
    description:
      "Antes de gastar mídia de verdade, simula o teste: qual hipótese validar primeiro, o que variar " +
      "(ângulo, oferta, público), previsão de vencedor e o critério de parada.",
    icon: <FlaskConical size={15} />,
    tone: "bg-violet-500/15 text-violet-400"
  },
  {
    id: "commander.scientists.performance",
    label: "Performance Scientist",
    description:
      "Analisa as métricas reais das suas campanhas dos últimos dias (gasto, CTR, CPA, ROAS) e " +
      "recomenda ações concretas: o que escalar, o que pausar e alertas de risco.",
    icon: <Gauge size={15} />,
    tone: "bg-amber-500/15 text-amber-400"
  },
  {
    id: "commander.scientists.hypothesis",
    label: "Hypothesis Scientist",
    description:
      "Lê os achados dos outros Scientists e formula hipóteses testáveis — o que mudar, o resultado " +
      "esperado e como validar — prontas pra virar um teste.",
    icon: <Lightbulb size={15} />,
    tone: "bg-yellow-500/15 text-yellow-400"
  },
  {
    id: "commander.scientists.confidence",
    label: "Confidence Scientist",
    description:
      "Audita a qualidade da pesquisa: o que está bem sustentado por evidência, o que é fraco ou " +
      "contraditório entre os outros Scientists, e o que ainda falta responder.",
    icon: <ShieldCheck size={15} />,
    tone: "bg-indigo-500/15 text-indigo-400"
  }
];

export function StatusList({
  rows,
  resolved,
  disabled,
  loading,
  savingId,
  onToggle
}: {
  rows: StatusRow[];
  resolved: ResolvedMap;
  disabled: Set<string>;
  loading: boolean;
  savingId: string | null;
  onToggle: (id: string, next: boolean) => void;
}) {
  return (
    <div className="ui-campaign-table-shell ui-campaign-table-shell--compact overflow-hidden">
      {rows.map((row) => {
        const platformOn = resolved[row.id] !== false;
        const userOn = !disabled.has(row.id);
        const on = platformOn && userOn;
        return (
          <div
            key={row.id}
            className="flex flex-wrap items-center gap-3 border-b border-[var(--creator-card-border)] p-4 last:border-0"
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                row.tone ?? "bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]"
              }`}
            >
              {row.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-heading text-sm font-semibold text-[var(--text-main)]">
                  {row.label}
                </span>
                <span
                  className={
                    on
                      ? "ds-table-compact-badge ds-table-compact-badge--success"
                      : "ds-table-compact-badge ds-table-compact-badge--neutral"
                  }
                >
                  {loading ? "…" : on ? "Ativo" : "Desligado"}
                </span>
                {!platformOn ? (
                  <span className="font-body text-[10px] text-[var(--text-dimmer)]">
                    (indisponível no seu plano)
                  </span>
                ) : null}
              </div>
              <p className="mt-1 font-body text-[11px] text-[var(--text-dimmer)]">{row.description}</p>
            </div>
            <label
              className={`flex shrink-0 cursor-pointer items-center gap-2 font-body text-xs text-[var(--text-dim)] ${
                !platformOn ? "cursor-not-allowed opacity-40" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={userOn}
                disabled={loading || !platformOn || savingId === row.id}
                onChange={(e) => onToggle(row.id, e.target.checked)}
                className="accent-[var(--ui-accent)]"
              />
              Quero isso ligado
            </label>
          </div>
        );
      })}
    </div>
  );
}
