/**
 * Variantes do herói da landing de teste (`/teste?feature=...`).
 *
 * O truque para ter message match com três anúncios diferentes sem manter três páginas:
 * só o herói muda, o resto da página é idêntico. Uma URL concentra o tráfego, a
 * mensuração e o aprendizado; três URLs dividiriam tudo por três.
 *
 * Valor desconhecido cai no herói geral, então um anúncio com `feature` errado nunca
 * quebra a página.
 */

export const TRIAL_LANDING_FEATURES = ["cockpit", "relatorios", "criativos"] as const;

export type TrialLandingFeature = (typeof TRIAL_LANDING_FEATURES)[number] | "default";

/** Chaves do namespace `trialLanding` usadas por cada variante. */
export const TRIAL_LANDING_HERO_KEYS = {
  default: { headline: "heroHeadline", sub: "heroSub" },
  cockpit: { headline: "heroHeadlineCockpit", sub: "heroSubCockpit" },
  relatorios: { headline: "heroHeadlineRelatorios", sub: "heroSubRelatorios" },
  criativos: { headline: "heroHeadlineCriativos", sub: "heroSubCriativos" }
} as const satisfies Record<TrialLandingFeature, { headline: string; sub: string }>;

/** Lê o `?feature=` da URL; qualquer coisa fora da lista vira o herói geral. */
export function resolveTrialLandingFeature(
  value: string | string[] | undefined
): TrialLandingFeature {
  const raw = (Array.isArray(value) ? value[0] : value)?.trim().toLowerCase();
  const match = TRIAL_LANDING_FEATURES.find((feature) => feature === raw);
  return match ?? "default";
}
