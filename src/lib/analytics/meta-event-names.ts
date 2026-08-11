/**
 * Nomes de evento padrão da Meta que o site usa — **fonte única**.
 *
 * Existe porque a lista vivia duplicada em [[src/lib/analytics.ts]] (navegador) e
 * [[src/lib/analytics/meta-server-events.ts]] (servidor), e as duas divergiram: a do
 * servidor não tinha os eventos de meio de funil, então a rota do CAPI aceitava
 * qualquer string. Sem `server-only` de propósito — os dois lados importam daqui.
 *
 * Ao adicionar um evento aqui, confira que ele é um *standard event* da Meta. Nome
 * fora da lista da Meta vira evento personalizado e não serve para otimização.
 */
export const META_EVENT_NAMES = [
  "Lead",
  "CompleteRegistration",
  "Contact",
  "ViewContent",
  "AddToCart",
  "InitiateCheckout",
  "AddPaymentInfo",
  "Purchase",
  "Subscribe",
  "StartTrial"
] as const;

export type MetaEventName = (typeof META_EVENT_NAMES)[number];

/** Valida um nome vindo de fora (corpo de request público, por exemplo). */
export function isMetaEventName(value: unknown): value is MetaEventName {
  return typeof value === "string" && (META_EVENT_NAMES as readonly string[]).includes(value);
}
