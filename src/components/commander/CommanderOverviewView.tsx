"use client";

import { useEffect, useState } from "react";
import { Activity, Sparkles, Zap } from "lucide-react";

import { AppPageShell } from "@/components/layout/AppPageShell";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { AutomationsClient } from "@/components/AutomationsClient";
import { useCommanderPreferences } from "@/components/commander/useCommanderPreferences";

type ActivityRow = {
  id: string;
  createdAt: string;
  kind: string | null;
  question: string | null;
  answer: string | null;
  creditsCharged: number;
};

const KIND_LABEL: Record<string, string> = {
  chat: "Conversa / veredito",
  learnings: "Aprendizado",
  actions: "Ação sugerida",
  hypotheses: "Hipótese"
};

function HistoryPanel() {
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    fetch("/api/commander/activity")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setActivity(j.activity ?? []);
      })
      .finally(() => setActivityLoading(false));
  }, []);

  const totalCredits = activity.reduce((sum, a) => sum + (a.creditsCharged || 0), 0);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="font-body text-[11px] text-[var(--text-dimmer)]">
          O que foi analisado e a resposta real do Commander — em ordem, mais recente primeiro.
        </p>
        {activity.length ? (
          <span className="shrink-0 font-body text-[11px] text-[var(--text-dimmer)]">
            {totalCredits} crédito{totalCredits === 1 ? "" : "s"} nas últimas {activity.length} chamadas
          </span>
        ) : null}
      </div>
      {activityLoading ? (
        <p className="font-body text-xs text-[var(--text-dim)]">Carregando…</p>
      ) : activity.length === 0 ? (
        <p className="font-body text-xs text-[var(--text-dim)]">
          Nenhuma chamada real de IA ainda — assim que o Commander responder no chat ou dar um
          veredito, aparece aqui.
        </p>
      ) : (
        <div className="ui-campaign-table-shell ui-campaign-table-shell--compact overflow-hidden">
          {activity.map((a) => (
            <div
              key={a.id}
              className="flex flex-col gap-1.5 border-b border-[var(--creator-card-border)] p-3 last:border-0"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--ui-accent)]">
                  {a.kind ? (KIND_LABEL[a.kind] ?? a.kind) : "Chamada"}
                </span>
                <span className="shrink-0 text-[10px] text-[var(--text-dimmer)]">
                  {new Date(a.createdAt).toLocaleString("pt-BR")}
                </span>
              </div>
              {a.question ? (
                <p className="text-[11px] leading-snug text-[var(--text-dim)]">
                  <span className="font-medium text-[var(--text-main)]">Analisado:</span> {a.question}
                </p>
              ) : null}
              {a.answer ? (
                <p className="text-[11px] leading-snug text-[var(--text-dim)]">
                  <span className="font-medium text-[var(--text-main)]">Resposta:</span> {a.answer}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const INNER_TABS = [
  { id: "rules", label: "Regras", icon: Zap },
  { id: "history", label: "Histórico", icon: Activity }
] as const;
type InnerTabId = (typeof INNER_TABS)[number]["id"];

export function CommanderOverviewView() {
  const [innerTab, setInnerTab] = useState<InnerTabId>("rules");
  const { loading, commanderPlatformOn, commanderUserOn, commanderOn, savingId, toggle } =
    useCommanderPreferences();

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
              automações — sempre em modo aprovação, nada roda sozinho sem seu OK.
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

        <div className="flex gap-1 border-b" style={{ borderColor: "var(--border-color)" }}>
          {INNER_TABS.map((it) => {
            const isActive = innerTab === it.id;
            const Icon = it.icon;
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => setInnerTab(it.id)}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-t-lg px-3.5 py-1.5 font-body text-xs font-medium transition-all"
                style={{
                  background: isActive ? "var(--ui-accent-muted)" : "transparent",
                  color: isActive ? "var(--ui-accent)" : "var(--text-dim)",
                  border: isActive ? "1px solid var(--ui-accent-border)" : "1px solid transparent",
                  borderBottom: isActive ? "1px solid var(--ui-accent-muted)" : "1px solid transparent",
                  fontWeight: isActive ? 600 : 400
                }}
              >
                <Icon size={13} />
                {it.label}
              </button>
            );
          })}
        </div>

        {innerTab === "rules" ? <AutomationsClient /> : <HistoryPanel />}
      </div>
    </AppPageShell>
  );
}
