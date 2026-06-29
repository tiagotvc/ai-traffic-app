"use client";

import { useTranslations } from "next-intl";

import { OrionTrafficLoadingOverlay } from "@/components/ui/OrionTrafficLoadingOverlay";

/**
 * Tela de carregamento padrão das transições de rota (App Router `loading.tsx`).
 * Mostra o overlay Orion enquanto o próximo segmento carrega — some sozinho ao
 * terminar (o `loading.tsx` desmonta).
 */
export function RouteLoadingScreen() {
  const t = useTranslations("common");
  return <OrionTrafficLoadingOverlay open minimal title={t("loading")} />;
}
