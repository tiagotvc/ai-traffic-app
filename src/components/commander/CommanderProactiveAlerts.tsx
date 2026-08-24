"use client";

import { MessageCircleQuestion, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { DsSlideOver } from "@/design-system";
import { CommanderChatThread } from "./CommanderChatThread";

type PromptAlert = {
  id: string;
  commanderPrompt: string;
  clientId: string | null;
  clientSlug: string | null;
  clientName: string | null;
};

/**
 * Ponte alerta → conversa (Camada 4): alertas `alert_only` do motor de automação que já
 * nasceram com uma pergunta pronta pro Commander. Reconhece o alerta (mesmo endpoint que
 * a tela de Alertas já usa) assim que o usuário abre a conversa — some da lista sem
 * precisar de um filtro novo no backend.
 */
export function CommanderProactiveAlerts() {
  const [alerts, setAlerts] = useState<PromptAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAlert, setOpenAlert] = useState<PromptAlert | null>(null);

  useEffect(() => {
    fetch("/api/alerts?hasCommanderPrompt=1&limit=5")
      .then((r) => r.json())
      .then((j) => setAlerts(j.alerts ?? []))
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false));
  }, []);

  const openConversation = (alert: PromptAlert) => {
    setOpenAlert(alert);
    setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
    void fetch(`/api/alerts/${alert.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "acknowledge" })
    }).catch(() => {
      /* best-effort — a conversa já abriu, reconhecer o alerta não bloqueia nada */
    });
  };

  if (loading) return null;

  return (
    <>
      {alerts.length > 0 ? (
        <div className="campaign-creator-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
              <MessageCircleQuestion size={14} />
            </span>
            <div className="min-w-0">
              <div className="font-heading text-sm font-semibold text-[var(--text-main)]">
                O Commander notou algo
              </div>
              <p className="font-body text-[11px] text-[var(--text-dimmer)]">
                Alertas do motor de automação com uma pergunta pronta pra investigar.
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            {alerts.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => openConversation(a)}
                className="block w-full rounded-lg border border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] px-3 py-2 text-left text-xs leading-relaxed text-[var(--text-main)] transition-colors hover:brightness-95"
              >
                {a.commanderPrompt}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {openAlert ? (
        <DsSlideOver
          open
          onClose={() => setOpenAlert(null)}
          title="Commander"
          subtitle={openAlert.clientName ? `Comando estratégico — ${openAlert.clientName}` : undefined}
          titleIcon={<Sparkles size={16} />}
          width="md"
        >
          <CommanderChatThread
            clientSlug={openAlert.clientSlug ?? undefined}
            fill
            autoAsk={openAlert.commanderPrompt}
          />
        </DsSlideOver>
      ) : null}
    </>
  );
}
