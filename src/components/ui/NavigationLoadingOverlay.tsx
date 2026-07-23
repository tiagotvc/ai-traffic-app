"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { OrionTrafficLoadingOverlay } from "@/components/ui/OrionTrafficLoadingOverlay";
import { routeLoadingKey } from "@/lib/loading-copy";

/** Tempo máximo de exibição (failsafe contra overlay preso). */
const SAFETY_MS = 12000;

/** Evento para acionar o overlay imperativamente (ex.: antes de um `router.push` programático). */
export const NAV_LOADING_EVENT = "orion:navigation-loading";

/**
 * Dispara o overlay de carregamento de rota antes de uma navegação programática.
 * Passe o caminho de destino para o overlay mostrar o feedback contextual correto.
 */
export function triggerNavigationLoading(path?: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(NAV_LOADING_EVENT, { detail: { path } }));
  }
}

/**
 * Mostra o overlay de carregamento em TODA navegação interna (cliques em links/menus e
 * `router.push`), inclusive rotas já cacheadas pelo Router Cache que o `loading.tsx` não cobre.
 * Aparece no início da navegação (com feedback contextual da tela de destino) e some quando a rota
 * (pathname/query) muda.
 */
export function NavigationLoadingOverlay() {
  const t = useTranslations("loading");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [targetPath, setTargetPath] = useState(pathname);

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
    const begin = (path?: string) => {
      setTargetPath(path ?? window.location.pathname);
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
      begin(url.pathname);
    };

    const onPopState = () => begin(window.location.pathname);
    const onTrigger = (e: Event) => {
      const path = (e as CustomEvent<{ path?: string }>).detail?.path;
      begin(path);
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    window.addEventListener(NAV_LOADING_EVENT, onTrigger);

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
            // `pushState` pode ser chamado durante a fase de commit do React (dentro de um
            // useInsertionEffect), onde agendar setState é proibido. Adia para um microtask,
            // que roda após o commit — evita "useInsertionEffect must not schedule updates".
            const path = url.pathname;
            queueMicrotask(() => begin(path));
          }
        }
      } catch {
        /* ignore */
      }
      return origPush(...args);
    };

    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener(NAV_LOADING_EVENT, onTrigger);
      history.pushState = origPush;
      clearSafety();
    };
  }, []);

  const key = routeLoadingKey(targetPath);
  return (
    <OrionTrafficLoadingOverlay
      open={loading}
      title={t(`${key}Title`)}
      message={t(`${key}Message`)}
    />
  );
}
