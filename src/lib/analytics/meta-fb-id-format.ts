/**
 * Formato dos identificadores de navegador da Meta (`_fbp` / `_fbc`).
 *
 * Sem `server-only` de propósito, pela mesma razão de [[src/lib/analytics/meta-event-names.ts]]:
 * são funções puras que precisam ser testáveis. Quem lê e grava cookie é o
 * [[src/lib/analytics/meta-browser-ids.ts]], esse sim restrito ao servidor.
 *
 * Formato: `fb.<subdomainIndex>.<criacaoEmMs>.<valor>`. Valor fora desse formato é
 * aceito no envio e descartado na correspondência, ou seja, falha silenciosa.
 */

/**
 * `1` = domínio raiz (`orion.com.br`). É o que o Pixel usa no caso comum, e o valor só
 * precisa ser consistente entre servidor e navegador: quem gravar primeiro define, e o
 * outro reaproveita o cookie existente.
 */
export const FB_SUBDOMAIN_INDEX = 1;

/**
 * O Click ID (`fb.1.<ms>.<fbclid>`) mora em [[src/lib/analytics/attribution.ts]], que já
 * o construía para o cadastro. Reexportado aqui só para quem pensa em "formato de id da
 * Meta" achar tudo num lugar — a implementação continua sendo uma só.
 */
export { buildFbcFromFbclid } from "@/lib/analytics/attribution";

/** `fb.1.<ms>.<aleatório>` — id de navegador, sem PII. */
export function buildFbp(nowMs: number, random: number): string {
  return `fb.${FB_SUBDOMAIN_INDEX}.${nowMs}.${random}`;
}

/** Extrai o `fbclid` da URL do evento. URL inválida não derruba o rastreio. */
export function readFbclid(eventSourceUrl?: string | null): string | null {
  if (!eventSourceUrl) return null;
  try {
    const value = new URL(eventSourceUrl).searchParams.get("fbclid")?.trim();
    return value ? value : null;
  } catch {
    return null;
  }
}
