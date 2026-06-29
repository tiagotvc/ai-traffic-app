"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

import { OrionTrafficLoadingOverlay } from "@/components/ui/OrionTrafficLoadingOverlay";
import { routeLoadingKey } from "@/lib/loading-copy";

/**
 * Tela de carregamento das transições de rota (App Router `loading.tsx` e fallbacks de Suspense).
 * Mostra o overlay Orion com feedback contextual da tela (ex.: "Carregando métricas…") — some
 * sozinho ao terminar (o fallback desmonta).
 */
export function RouteLoadingScreen() {
  const t = useTranslations("loading");
  const pathname = usePathname();
  const key = routeLoadingKey(pathname);
  return (
    <OrionTrafficLoadingOverlay
      open
      title={t(`${key}Title`)}
      message={t(`${key}Message`)}
    />
  );
}
