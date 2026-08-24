"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

import { AppPageShell } from "@/components/layout/AppPageShell";
import { useCommandStripOptional } from "@/components/layout/CommandStripContext";
import { CreativeStudioView } from "@/components/creative-studio/CreativeStudioView";

/**
 * Wrapper tenant-wide do Estúdio Criativo — antes vivia só aninhado sob um cliente
 * (`/clients/[clientId]/creative-studio`), agora é item próprio no menu lateral. O
 * cliente vem do MESMO filtro global do resto do app (`CommandStripContext`, o dropdown
 * que aparece em "Mostrar filtros" — igual Campanhas), não um seletor próprio da tela.
 * `?client=` (slug) só serve pra sincronizar esse filtro global quando chega de um link
 * com cliente já conhecido (ex: botão na página do cliente).
 */
export function CreativeStudioTopLevelView() {
  const searchParams = useSearchParams();
  const strip = useCommandStripOptional();
  const appliedParam = useRef(false);

  useEffect(() => {
    if (appliedParam.current || !strip || !strip.clientOptions.length) return;
    const preselect = searchParams.get("client");
    if (!preselect) {
      appliedParam.current = true;
      return;
    }
    const match = strip.clientOptions.find((c) => c.slug === preselect);
    if (match) strip.setClientFilter(match.slug);
    appliedParam.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strip?.clientOptions.length]);

  const selected =
    strip?.clientOptions.find((c) => c.slug === strip.clientFilter) ?? strip?.clientOptions[0] ?? null;

  if (!selected) {
    return (
      <AppPageShell as="main" gap="loose" className="flex-1 overflow-y-auto">
        <p className="font-body text-xs text-[var(--text-dim)]">
          {strip ? "Cadastre um cliente primeiro." : "Carregando…"}
        </p>
      </AppPageShell>
    );
  }

  // key força reset de estado (rascunho/variações geradas) ao trocar de cliente pelo
  // filtro global — sem isso, geração da conta anterior ficaria visível na nova.
  return <CreativeStudioView key={selected.slug} clientSlug={selected.slug} clientName={selected.name} />;
}
