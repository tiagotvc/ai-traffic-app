"use client";

import { useCallback, useEffect, useState } from "react";
import { Brain, FlaskConical, Gauge, Megaphone, Sparkles, Users, Zap } from "lucide-react";

import { AppPageShell } from "@/components/layout/AppPageShell";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { Link } from "@/i18n/navigation";

/**
 * Página de configuração do Orion Commander (menu próprio no sidebar).
 * Mostra onde o Commander está ativo; admin da plataforma liga/desliga cada capacidade
 * (escreve nos platform feature flags via /api/admin/platform/feature-flags — os mesmos
 * do admin de Features). Não-admins veem o status em modo leitura.
 */

type FlagRow = {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
};

const ROWS: FlagRow[] = [
  {
    id: "commander",
    label: "Commander ativo (global)",
    description: "Desligar aqui desativa o Commander em todos os módulos do produto.",
    icon: <Sparkles size={15} />
  },
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
    description: "Histórico real das campanhas no contexto do chat e no painel.",
    icon: <Brain size={15} />
  },
  {
    id: "commander.ruleProposals",
    label: "Propostas de regra por conversa",
    description: "“Crie uma regra que…” vira proposta com simulação de 30 dias (Commander→Engine).",
    icon: <Zap size={15} />
  },
  {
    id: "commander.parametersContext",
    label: "Metas no contexto do chat",
    description: "CPA alvo, ROAS mínimo e demais parâmetros do cliente entram na conversa.",
    icon: <Gauge size={15} />
  },
  {
    id: "commander.scientists",
    label: "Scientists (pesquisa)",
    description: "Capacidades de pesquisa que o Commander orquestra (fontes e cientistas no admin de Features).",
    icon: <FlaskConical size={15} />
  }
];

type ResolvedMap = Record<string, boolean | undefined>;

export function CommanderSettingsView() {
  const [resolved, setResolved] = useState<ResolvedMap>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, adminRes] = await Promise.all([
        fetch("/api/me/entitlements").then((r) => r.json()).catch(() => null),
        fetch("/api/admin/platform/feature-flags").then((r) => (r.ok ? r.json() : null)).catch(() => null)
      ]);
      if (meRes?.platformFeatures) setResolved(meRes.platformFeatures as ResolvedMap);
      setIsAdmin(Boolean(adminRes?.ok));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = useCallback(
    async (id: string, next: boolean) => {
      setSavingId(id);
      setError(null);
      try {
        const res = await fetch("/api/admin/platform/feature-flags", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            platformFeatures: { [id]: { mode: next ? "global" : "off" } }
          })
        });
        const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
        if (!res.ok || !json?.ok) throw new Error(json?.error ?? "Falha ao salvar");
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao salvar");
      } finally {
        setSavingId(null);
      }
    },
    [load]
  );

  const isOn = (id: string) => resolved[id] !== false;
  const rootOn = isOn("commander");

  return (
    <AppPageShell as="main" gap="loose" className="flex-1 overflow-y-auto">
      <div className="space-y-6">
        <PageToolbar
          icon={<Sparkles size={16} />}
          title="Orion Commander"
          subtitle="A IA de coordenação do ecossistema: conversa, pesquisa e propõe ações. Configure onde ele atua."
          showGlobalFilters={false}
          showSync={false}
        />

        {error ? (
          <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-300">
            {error}
          </div>
        ) : null}

        <div className="ui-campaign-table-shell ui-campaign-table-shell--compact overflow-hidden">
          {ROWS.map((row) => {
            const on = isOn(row.id);
            const dimmed = row.id !== "commander" && !rootOn;
            return (
              <div
                key={row.id}
                className={`flex flex-wrap items-center gap-3 border-b border-[var(--creator-card-border)] p-4 last:border-0 ${
                  dimmed ? "opacity-50" : ""
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
                  {row.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-heading text-sm font-semibold text-[var(--text-main)]">
                      {row.label}
                    </span>
                    <span
                      className={
                        on && !dimmed
                          ? "ds-table-compact-badge ds-table-compact-badge--success"
                          : "ds-table-compact-badge ds-table-compact-badge--neutral"
                      }
                    >
                      {loading ? "…" : on && !dimmed ? "Ativo" : "Desligado"}
                    </span>
                  </div>
                  <p className="mt-1 font-body text-[11px] text-[var(--text-dimmer)]">{row.description}</p>
                </div>
                {isAdmin ? (
                  <label className="flex cursor-pointer items-center gap-2 font-body text-xs text-[var(--text-dim)]">
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={loading || savingId === row.id}
                      onChange={(e) => void toggle(row.id, e.target.checked)}
                      className="accent-[var(--ui-accent)]"
                    />
                    Ativo
                  </label>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="campaign-creator-card flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="font-body text-xs text-[var(--text-dim)]">
            As regras que o Commander propõe são criadas no <strong>Motor de regras</strong> (modo aprovação) —
            e o ajuste fino dos Scientists (fontes, cientistas individuais) fica no admin de Features.
          </p>
          <Link
            href="/automations"
            className="ui-btn-accent inline-flex h-8 items-center justify-center gap-1.5 px-3 font-heading text-xs font-semibold"
          >
            <Zap size={13} />
            Abrir Motor de regras
          </Link>
        </div>

        {!isAdmin && !loading ? (
          <p className="font-body text-[11px] text-[var(--text-dimmer)]">
            Somente administradores da plataforma podem alterar estas configurações.
          </p>
        ) : null}
      </div>
    </AppPageShell>
  );
}
