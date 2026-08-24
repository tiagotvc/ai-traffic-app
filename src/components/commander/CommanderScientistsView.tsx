"use client";

import { AlertTriangle, Lock, Sparkles } from "lucide-react";

import { AppPageShell } from "@/components/layout/AppPageShell";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { Link } from "@/i18n/navigation";
import { CommanderScientistLog } from "@/components/commander/CommanderScientistLog";
import { useCommanderPreferences } from "@/components/commander/useCommanderPreferences";

/**
 * Rota gated também no servidor (page.tsx de /commander/scientists redireciona antes
 * de renderizar isso quando o plano não inclui Scientists) — este componente ainda
 * checa de novo no client só pra cobrir a transição/loading, não é a defesa real.
 */
export function CommanderScientistsView({
  researchApiConfigured = true
}: {
  /** Servidor já checou `isMetaAdLibraryConfigured()` — default true pra não piscar aviso falso durante SSR/hidratação. */
  researchApiConfigured?: boolean;
}) {
  const { resolved, disabled, scientistsAllowed, loading, savingId, toggle } = useCommanderPreferences();

  return (
    <AppPageShell as="main" gap="loose" className="flex-1 overflow-y-auto">
      <div className="space-y-6">
        <PageToolbar
          icon={<Sparkles size={16} />}
          title="Cientistas"
          subtitle="Capacidades de pesquisa real que o Commander aciona sozinho ou a pedido."
          showGlobalFilters={false}
          showSync={false}
        />

        {!loading && !scientistsAllowed ? (
          <div className="campaign-creator-card flex flex-col items-center gap-3 p-8 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
              <Lock size={20} />
            </span>
            <div>
              <p className="font-heading text-sm font-semibold text-[var(--text-main)]">
                Scientists são Advanced e Agency
              </p>
              <p className="mt-1 max-w-md font-body text-xs text-[var(--text-dimmer)]">
                Cada Scientist é uma capacidade de pesquisa real (concorrência, geo, tendências,
                performance…) que o Commander aciona sozinho ou a pedido. Disponível a partir do plano
                Advanced.
              </p>
            </div>
            <Link
              href="/billing"
              className="ui-btn-accent inline-flex h-8 items-center justify-center gap-1.5 px-3 font-heading text-xs font-semibold"
            >
              Ver planos
            </Link>
          </div>
        ) : (
          <div>
            <p className="mb-3 font-body text-[11px] text-[var(--text-dimmer)]">
              Cada Scientist é uma capacidade de pesquisa real que o Commander pode acionar sozinho
              quando faz sentido, ou você pode pedir diretamente no chat. Aqui você só liga/desliga —
              o resultado da pesquisa aparece nas respostas do chat (no criador de campanha, na página
              do cliente, ou em Aprendizados/Hipóteses), não nesta tela. Não quer que ele opine sobre
              algo específico? Desligue aqui.
            </p>
            {!researchApiConfigured ? (
              <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3">
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-500" />
                <p className="font-body text-[11px] leading-relaxed text-[var(--text-dim)]">
                  <span className="font-semibold text-[var(--text-main)]">Fonte de mercado não configurada no servidor.</span>{" "}
                  Sem <code className="font-mono text-[10px]">SEARCHAPI_API_KEY</code> ou{" "}
                  <code className="font-mono text-[10px]">META_AD_LIBRARY_ACCESS_TOKEN</code>, o Marketing
                  Scientist perde a fonte principal (Meta Ad Library) e responde com dados mais limitados.
                </p>
              </div>
            ) : null}
            <CommanderScientistLog
              resolved={resolved}
              disabled={disabled}
              loading={loading}
              savingId={savingId}
              onToggle={toggle}
            />
          </div>
        )}
      </div>
    </AppPageShell>
  );
}
