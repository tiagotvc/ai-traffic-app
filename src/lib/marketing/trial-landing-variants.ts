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
 * Hoje aponta pro que existe em `public/examples`. Quando as três telas definitivas
 * chegarem (uma por variante, mesmo idioma e mesmo tema), é só trocar os caminhos aqui:
 * nenhum outro arquivo precisa mudar.
 */
export const TRIAL_LANDING_IMAGES: Record<TrialLandingFeature, string> = {
  cockpit: "/examples/dashboard.png",
  relatorios: "/examples/simple_and_intuitive.png",
  criativos: "/examples/creative-ranking.jpg"
};

/** Lê o `?feature=` da URL; qualquer coisa fora da lista vira a variante padrão. */
export function resolveTrialLandingFeature(
  value: string | string[] | undefined
): TrialLandingFeature {
  const raw = (Array.isArray(value) ? value[0] : value)?.trim().toLowerCase();
  const match = TRIAL_LANDING_FEATURES.find((feature) => feature === raw);
  return match ?? DEFAULT_TRIAL_LANDING_FEATURE;
}
