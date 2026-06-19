/** Nichos de mercado — usados no cadastro do cliente e no Labs. */
export const CLIENT_NICHE_OPTIONS = [
  { value: "", labelKey: "nicheUnset" },
  { value: "clinica", labelKey: "nicheClinica" },
  { value: "ecommerce", labelKey: "nicheEcommerce" },
  { value: "infoproduto", labelKey: "nicheInfoproduto" },
  { value: "imobiliaria", labelKey: "nicheImobiliaria" },
  { value: "saas", labelKey: "nicheSaas" },
  { value: "apps_games", labelKey: "nicheAppsGames" },
  { value: "outro", labelKey: "nicheOutro" }
] as const;

export type ClientNicheValue = (typeof CLIENT_NICHE_OPTIONS)[number]["value"];
