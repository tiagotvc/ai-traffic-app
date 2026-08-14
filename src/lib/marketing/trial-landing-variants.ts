/**
 * Variantes da landing de teste (`/teste?feature=...`).
 *
 * O truque para ter message match com três anúncios diferentes sem manter três páginas:
 * a variante troca o herói, a imagem do produto e o bloco de prova, e o resto da página
 * é idêntico. Uma URL concentra o tráfego, a mensuração e o aprendizado; três URLs
 * dividiriam tudo por três.
 *
 * Valor desconhecido cai no cockpit, que é a promessa mais ampla, então um anúncio com
 * `feature` errado nunca quebra a página.
 */

export const TRIAL_LANDING_FEATURES = ["cockpit", "relatorios", "criativos"] as const;

export type TrialLandingFeature = (typeof TRIAL_LANDING_FEATURES)[number];

export const DEFAULT_TRIAL_LANDING_FEATURE: TrialLandingFeature = "cockpit";

/**
 * Screenshot que aparece no navegador falso de cada variante.
 *
 * São telas reais do produto, em português e no tema escuro, com duas regiões borradas
 * antes de entrarem no repositório: o rodapé da barra lateral, que mostrava o nome e o
 * cargo de uma pessoa real logada, e as miniaturas do ranking, que são anúncios de
 * clientes com rostos identificáveis. Mesma política do
 * `public/examples/creative-ranking.jpg` que já estava no site.
 *
 * Trocar uma tela é trocar o caminho aqui: nenhum outro arquivo precisa mudar. Se a
 * substituta vier de uma conta real, passe o mesmo tratamento antes.
 */
export const TRIAL_LANDING_IMAGES: Record<TrialLandingFeature, string> = {
  cockpit: "/examples/lp/cockpit.webp",
  relatorios: "/examples/lp/relatorios.webp",
  criativos: "/examples/lp/criativos.webp"
};

/** Lê o `?feature=` da URL; qualquer coisa fora da lista vira a variante padrão. */
export function resolveTrialLandingFeature(
  value: string | string[] | undefined
): TrialLandingFeature {
  const raw = (Array.isArray(value) ? value[0] : value)?.trim().toLowerCase();
  const match = TRIAL_LANDING_FEATURES.find((feature) => feature === raw);
  return match ?? DEFAULT_TRIAL_LANDING_FEATURE;
}
