/**
 * Mapeia um pathname (com ou sem prefixo de locale) para a chave de copy de carregamento.
 * Usado pelas telas de loading (rota + transições) para mostrar um feedback contextual em PT-BR
 * (ex.: dashboard → "Carregando métricas…") em vez de um texto genérico.
 *
 * As chaves correspondem a `<key>Title` / `<key>Message` no namespace i18n `loading`.
 */
export function routeLoadingKey(pathname: string): string {
  const p = pathname.replace(/^\/(pt-BR|en)/, "").split("?")[0] || "/";

  if (p === "/" || p.startsWith("/dashboard")) return "dashboard";
  if (p.startsWith("/campaigns/new") || p.startsWith("/ads/new")) return "campaignCreator";
  if (p.startsWith("/campaigns")) return "campaigns";
  if (p.startsWith("/audiences")) return "audiences";
  if (p.startsWith("/creatives") || p.startsWith("/creative-memory")) return "creatives";
  if (p.startsWith("/reports")) return "reports";
  if (p.startsWith("/clients")) return "clients";
  if (p.startsWith("/agency-brain")) return "agencyBrain";
  if (p.startsWith("/ai-center")) return "aiCenter";
  if (p.startsWith("/alerts")) return "alerts";
  if (p.startsWith("/automations")) return "automations";
  if (p.startsWith("/billing")) return "billing";
  if (p.startsWith("/settings")) return "settings";
  if (p.startsWith("/admin")) return "admin";

  return "default";
}
