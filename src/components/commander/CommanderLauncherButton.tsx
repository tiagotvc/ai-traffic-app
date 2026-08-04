"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";

import { DsSlideOver } from "@/design-system";
import { useCommanderAccess } from "@/hooks/useCommanderAccess";
import { CommanderChatThread } from "./CommanderChatThread";

/**
 * Ponto de entrada do Commander fora do criador de campanha — botão flutuante que abre
 * o mesmo chat (mesma conversa persistida por cliente) num `DsSlideOver`. Fail-closed:
 * some enquanto os flags carregam ou se o Commander não estiver disponível no plano.
 */
export function CommanderLauncherButton({
  clientSlug,
  clientName
}: {
  clientSlug: string | undefined;
  clientName?: string;
}) {
  const [open, setOpen] = useState(false);
  const { ready, commander } = useCommanderAccess();

  if (!clientSlug || !ready || !commander) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir o Commander"
        title="Commander"
        className="fixed bottom-6 right-6 z-[150] flex h-12 w-12 items-center justify-center rounded-full bg-[var(--ui-accent)] text-white shadow-lg shadow-[var(--ui-accent-glow)] transition-transform hover:scale-105"
      >
        <Sparkles size={20} />
      </button>

      <DsSlideOver
        open={open}
        onClose={() => setOpen(false)}
        title="Commander"
        subtitle={clientName ? `Comando estratégico — ${clientName}` : "Comando estratégico"}
        titleIcon={<Sparkles size={16} />}
        width="md"
      >
        <CommanderChatThread
          clientSlug={clientSlug}
          fill
          emptyHint="Pergunte ao Commander sobre este cliente — campanhas, métricas, o que fazer a seguir."
        />
      </DsSlideOver>
    </>
  );
}
