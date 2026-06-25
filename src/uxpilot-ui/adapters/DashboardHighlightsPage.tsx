"use client";

import { CommandStripBridgeProvider } from "@/uxpilot-ui/adapters/CommandStripBridge";
import { DashboardContentLive } from "@/uxpilot-ui/adapters/DashboardContentLive";

/**
 * Destaques — versão fixa e curada (modal "Personalizar" simples).
 *
 * O dashboard de Destaques NÃO é editável na v1. A versão canvas editável
 * (`DashboardHighlightsCanvasLive`, que monta a tela a partir de um layout de
 * widgets persistido) era selecionada por `useEntitlementsCanvas`, mas isso fazia
 * a tela "piscar" o layout fixo e depois recarregar o layout antigo memorizado.
 * O conceito de dashboard editável passa a ser do módulo Visão (futuro), então a
 * Destaques renderiza sempre a versão fixa. Não remover o canvas: ele será a base do Visão.
 */
export function DashboardHighlightsPage() {
  return (
    <CommandStripBridgeProvider>
      <DashboardContentLive />
    </CommandStripBridgeProvider>
  );
}
