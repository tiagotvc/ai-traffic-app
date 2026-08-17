import type { FunnelEventType } from "@/db/entities/FunnelEvent";

/**
 * As etapas que o navegador pode declarar. `completed_signup` e `started_trial` ficam
 * de fora de propósito: são gravadas no servidor, no ponto em que o fato realmente
 * acontece, para ninguém conseguir forjar um cadastro pelo console.
 */
export type BrowserFunnelEvent = Extract<
  FunnelEventType,
  "viewed_landing" | "clicked_cta" | "started_signup" | "viewed_pricing" | "started_checkout" | "completed_checkout"
>;

/**
 * Registra uma etapa do funil no nosso banco, do navegador.
 *
 * Diferente de [[src/lib/analytics.ts]], isto **não passa pelo banner de cookies**: é
 * registro primário da Orion sobre o próprio site (mesma base legal do funil de
 * checkout, que já grava assim), não compartilhamento com plataforma de anúncio. Por
 * isso é a única medição do funil que sobrevive a quem recusa cookies, e é nela que dá
 * pra confiar quando o número da Meta e o nosso divergirem.
 *
 * `pageUrl` viaja junto para o servidor extrair as utm_* da URL: a origem é lida de lá,
 * não de um campo que o cliente poderia inventar.
 *
 * Best-effort e nunca lança: telemetria não pode atrapalhar o clique. `keepalive` está
 * aqui porque a maior parte destas chamadas acontece em cima de uma navegação, e sem
 * ele o request morre junto com a página.
 */
export function trackFunnel(
  eventType: BrowserFunnelEvent,
  opts: { cta?: string; page?: string; planSlug?: string; email?: string } = {}
): void {
  if (typeof window === "undefined") return;

  try {
    void fetch("/api/track/funnel", {
      method: "POST",
      headers: { "content-type": "application/json" },
      keepalive: true,
      body: JSON.stringify({ eventType, pageUrl: window.location.href, ...opts })
    }).catch(() => {
      /* melhor esforço */
    });
  } catch {
    /* melhor esforço */
  }
}
