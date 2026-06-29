"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { OrionTrafficLoadingOverlay } from "@/components/ui/OrionTrafficLoadingOverlay";

/** Tempo máximo de exibição (failsafe contra overlay preso). */
const SAFETY_MS = 12000;

/** Evento para acionar o overlay imperativamente (ex.: antes de um `router.push` programático). */
export const NAV_LOADING_EVENT = "orion:navigation-loading";

/** Dispara o overlay de carregamento de rota antes de uma navegação programática. */
export function triggerNavigationLoading() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NAV_LOADING_EVENT));
  }
}

/**
 * Mostra o overlay de carregamento em TODA navegação interna (cliques em links/menus e
 * `router.push`), inclusive rotas já cacheadas pelo Router Cache que o `loading.tsx` não cobre.
 * Aparece no início da navegação e some quando a rota (pathname/query) muda.
 */
export function NavigationLoadingOverlay() {
  const t = useTranslations("common");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  const routeKey = `${pathname}?${searchParams.toString()}`;
  const prevKey = useRef(routeKey);
  const safetyTimer = useRef<number | undefined>(undefined);

  const clearSafety = () => {
    if (safetyTimer.current) {
      window.clearTimeout(safetyTimer.current);
      safetyTimer.current = undefined;
    }
  };

  // Rota commitou (pathname/query mudou) → esconde.
  useEffect(() => {
    if (prevKey.current !== routeKey) {
      prevKey.current = routeKey;
      clearSafety();
      setLoading(false);
    }
  }, [routeKey]);

  useEffect(() => {
    const start = () => {
      clearSafety();
      setLoading(true);
      safetyTimer.current = window.setTimeout(() => setLoading(false), SAFETY_MS);
    };

    const samePlace = (url: URL) =>
      url.pathname + url.search === window.location.pathname + window.location.search;

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const anchor = (e.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      const target = anchor.getAttribute("target");
      if (!href || (target && target !== "_self") || anchor.hasAttribute("download")) return;
      if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return; // externo
      if (samePlace(url)) return; // mesma rota → sem transição
      start();
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", start);
    window.addEventListener(NAV_LOADING_EVENT, start);

    // Navegações programáticas (router.push) → patch do history.
    // Só dispara quando o PATHNAME muda (ignora atualização só de query, ex.: troca de aba).
    const origPush = history.pushState.bind(history);
    history.pushState = function patchedPush(
      this: History,
      ...args: Parameters<History["pushState"]>
    ) {
      try {
        const next = args[2];
        if (next != null) {
          const url = new URL(String(next), window.location.href);
          if (url.origin === window.location.origin && url.pathname !== window.location.pathname) {
            start();
          }
        }
      } catch {
        /* ignore */
      }
      return origPush(...args);
    };

    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", start);
      window.removeEventListener(NAV_LOADING_EVENT, start);
      history.pushState = origPush;
      clearSafety();
    };
  }, []);

  return <OrionTrafficLoadingOverlay open={loading} minimal title={t("loading")} />;
}
