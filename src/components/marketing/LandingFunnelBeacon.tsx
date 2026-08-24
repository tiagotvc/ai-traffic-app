"use client";

import { useEffect, useRef } from "react";

import { trackFunnel, type BrowserFunnelEvent } from "@/lib/funnel/track-funnel";

/** As etapas que são "cheguei numa página". Clique e checkout têm gatilho próprio. */
type PageViewEvent = Extract<BrowserFunnelEvent, "viewed_landing" | "viewed_pricing">;

/**
 * Marca a chegada numa página pública no funil próprio. É o topo do funil de tráfego
 * pago: sem esta linha não dá pra dividir cadastros por visitas e saber se a perda foi
 * na página ou no formulário.
 *
 * Fora do banner de cookies de propósito, como o resto de [[src/lib/funnel/track-funnel.ts]].
 * O `page_view` do GA4 continua existindo em paralelo e continua sujeito a consentimento.
 *
 * Uma vez por montagem: em navegação client-side o componente remonta, então cada
 * página nova conta uma visita.
 */
export function LandingFunnelBeacon({
  page,
  event = "viewed_landing"
}: {
  page: string;
  /** `viewed_pricing` na página de planos: é a primeira etapa do funil de compra. */
  event?: PageViewEvent;
}) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackFunnel(event, { page });
  }, [page, event]);

  return null;
}
