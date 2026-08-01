"use client";

import { Settings2, Target } from "lucide-react";

import { AppPageShell } from "@/components/layout/AppPageShell";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { CAPABILITY_ROWS, StatusList } from "@/components/commander/CommanderStatusList";
import { useCommanderPreferences } from "@/components/commander/useCommanderPreferences";

export function CommanderConfigView() {
  const { resolved, disabled, loading, savingId, toggle, directModeOn, setDirectMode } =
    useCommanderPreferences();

  return (
    <AppPageShell as="main" gap="loose" className="flex-1 overflow-y-auto">
      <div className="space-y-6">
        <PageToolbar
          icon={<Settings2 size={16} />}
          title="Configurações do Commander"
          subtitle="O que está habilitado ou não, em cada tela."
          showGlobalFilters={false}
          showSync={false}
        />

        <div className="campaign-creator-card flex flex-wrap items-center gap-3 p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
            <Target size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-heading text-sm font-semibold text-[var(--text-main)]">
                Modo direto
              </span>
              <span
                className={
                  directModeOn
                    ? "ds-table-compact-badge ds-table-compact-badge--success"
                    : "ds-table-compact-badge ds-table-compact-badge--neutral"
                }
              >
                {loading ? "…" : directModeOn ? "Ativo" : "Desligado"}
              </span>
            </div>
            <p className="mt-1 font-body text-[11px] text-[var(--text-dimmer)]">
              Pra agência que já conhece o fluxo de cor: desliga as dicas óbvias de preenchimento
              ("adicione uma mídia", "selecione um público") no criador de campanha. Só fica o que é
              sinal de verdade — o veredito final da revisão e os achados dos Scientists.
            </p>
          </div>
          <label className="flex shrink-0 cursor-pointer items-center gap-2 font-body text-xs text-[var(--text-dim)]">
            <input
              type="checkbox"
              checked={directModeOn}
              disabled={loading}
              onChange={(e) => setDirectMode(e.target.checked)}
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
      </div>
    </AppPageShell>
  );
}
