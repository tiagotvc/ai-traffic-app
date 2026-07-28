"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Brain,
  FlaskConical,
  Gauge,
  Lightbulb,
  MapPin,
  Megaphone,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Zap
} from "lucide-react";

import { AppPageShell } from "@/components/layout/AppPageShell";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { Link } from "@/i18n/navigation";

/**
 * Tela do Orion Commander para o usuário final. Mostra o que o Commander faz por você
 * (onde atua, memória/contexto usados, Scientists disponíveis) e deixa VOCÊ decidir o
 * que quer ligado — é preferência sua (`/api/commander/preferences`), independente das
 * feature flags de plataforma (essas definem o que EXISTE; aqui é o que você QUER).
 * Uma capacidade só fica ativa de fato quando os dois lados topam.
 */

type StatusRow = {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  tone?: string;
};

const CAPABILITY_ROWS: StatusRow[] = [
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

const SCIENTIST_ROWS: StatusRow[] = [
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

type ResolvedMap = Record<string, boolean | undefined>;

function StatusList({
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

export function CommanderSettingsView() {
  const [resolved, setResolved] = useState<ResolvedMap>({});
  const [disabled, setDisabled] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch("/api/me/entitlements").then((r) => r.json()),
      fetch("/api/commander/preferences").then((r) => r.json())
    ])
      .then(([entitlements, prefs]: [{ platformFeatures?: ResolvedMap }, { disabled?: string[] }]) => {
        if (cancelled) return;
        if (entitlements.platformFeatures) setResolved(entitlements.platformFeatures);
        setDisabled(new Set(prefs.disabled ?? []));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = useCallback(async (id: string, next: boolean) => {
    setSavingId(id);
    setDisabled((prev) => {
      const copy = new Set(prev);
      if (next) copy.delete(id);
      else copy.add(id);
      return copy;
    });
    try {
      const res = await fetch("/api/commander/preferences", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, enabled: next })
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; disabled?: string[] } | null;
      if (res.ok && json?.disabled) setDisabled(new Set(json.disabled));
    } finally {
      setSavingId(null);
    }
  }, []);

  const commanderPlatformOn = resolved["commander"] !== false;
  const commanderUserOn = !disabled.has("commander");
  const commanderOn = commanderPlatformOn && commanderUserOn;

  return (
    <AppPageShell as="main" gap="loose" className="flex-1 overflow-y-auto">
      <div className="space-y-6">
        <PageToolbar
          icon={<Sparkles size={16} />}
          title="Orion Commander"
          subtitle="A IA de coordenação do ecossistema: conversa, pesquisa e propõe ações. Você decide o que fica ligado."
          showGlobalFilters={false}
          showSync={false}
        />

        <div className="campaign-creator-card flex flex-wrap items-center gap-3 p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
            <Sparkles size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-heading text-sm font-semibold text-[var(--text-main)]">Commander</span>
              <span
                className={
                  commanderOn
                    ? "ds-table-compact-badge ds-table-compact-badge--success"
                    : "ds-table-compact-badge ds-table-compact-badge--neutral"
                }
              >
                {loading ? "…" : commanderOn ? "Ativo" : "Desligado"}
              </span>
            </div>
            <p className="mt-1 font-body text-[11px] text-[var(--text-dimmer)]">
              Quando ativo, conversa com você, consulta o histórico das suas campanhas e pode propor
              automações — sempre em modo aprovação, nada roda sozinho sem seu OK. Desligar aqui desliga
              tudo abaixo de uma vez.
            </p>
          </div>
          <label
            className={`flex shrink-0 cursor-pointer items-center gap-2 font-body text-xs text-[var(--text-dim)] ${
              !commanderPlatformOn ? "cursor-not-allowed opacity-40" : ""
            }`}
          >
            <input
              type="checkbox"
              checked={commanderUserOn}
              disabled={loading || !commanderPlatformOn || savingId === "commander"}
              onChange={(e) => toggle("commander", e.target.checked)}
              className="accent-[var(--ui-accent)]"
            />
            Quero isso ligado
          </label>
        </div>

        <div>
          <h3 className="campaign-creator-orion-section-label mb-3">Onde e como atua</h3>
          <StatusList
            rows={CAPABILITY_ROWS}
            resolved={resolved}
            disabled={disabled}
            loading={loading}
            savingId={savingId}
            onToggle={toggle}
          />
        </div>

        <div>
          <h3 className="campaign-creator-orion-section-label mb-3">Scientists disponíveis</h3>
          <p className="mb-3 font-body text-[11px] text-[var(--text-dimmer)]">
            Cada Scientist é uma capacidade de pesquisa real que o Commander pode acionar sozinho quando
            faz sentido, ou você pode pedir diretamente no chat. Não quer que ele opine sobre algo
            específico? Desligue aqui.
          </p>
          <StatusList
            rows={SCIENTIST_ROWS}
            resolved={resolved}
            disabled={disabled}
            loading={loading}
            savingId={savingId}
            onToggle={toggle}
          />
        </div>

        <div className="campaign-creator-card flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="font-body text-xs text-[var(--text-dim)]">
            As regras que o Commander propõe são criadas no <strong>Motor de regras</strong>, sempre em
            modo aprovação.
          </p>
          <Link
            href="/automations"
            className="ui-btn-accent inline-flex h-8 items-center justify-center gap-1.5 px-3 font-heading text-xs font-semibold"
          >
            <Zap size={13} />
            Abrir Motor de regras
          </Link>
        </div>
      </div>
    </AppPageShell>
  );
}
