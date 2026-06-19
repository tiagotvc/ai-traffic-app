import type { ClientNiche } from "@/lib/agency-brain/domain/schemas";

/** Fallback search terms when no competitors are registered. */
export const NICHE_SEARCH_KEYWORDS: Record<ClientNiche, string[]> = {
  clinica: ["clínica estética", "tratamento estético", "harmonização facial"],
  ecommerce: ["loja online", "frete grátis", "oferta limitada"],
  infoproduto: ["curso online", "mentoria", "infoproduto"],
  imobiliaria: ["apartamento", "imóvel", "financiamento"],
  saas: ["software", "plataforma", "trial grátis"],
  apps_games: ["app mobile", "jogo", "download grátis"],
  outro: ["oferta", "promoção"]
};

export function resolveSearchTerms(niche: string | null | undefined): string[] {
  const key = (niche ?? "") as ClientNiche;
  if (key && key in NICHE_SEARCH_KEYWORDS) {
    return NICHE_SEARCH_KEYWORDS[key];
  }
  return ["oferta", "promoção"];
}

/** Map market country to Meta Ad Library ad_reached_countries codes. */
export function resolveAdCountries(marketCountry: string | null | undefined): string[] {
  const code = (marketCountry ?? "BR").toUpperCase();
  if (code === "EU") {
    return ["DE", "FR", "IT", "ES", "NL", "PT"];
  }
  if (code === "UK") return ["GB"];
  if (code === "BR") return ["BR"];
  if (code === "US") return ["US"];
  return [code.length === 2 ? code : "BR"];
}

export function isEuMarket(marketCountry: string | null | undefined): boolean {
  const code = (marketCountry ?? "").toUpperCase();
  return code === "EU" || ["DE", "FR", "IT", "ES", "NL", "PT", "GB", "UK"].includes(code);
}
