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

export type TrialLandingMedia = {
  /** Sempre existe. Vira o `poster` do vídeo e é o que aparece sem vídeo nenhum. */
  image: string;
  /**
   * Filmagem da tela, quando houver. Os dois formatos de propósito: webm é bem mais
   * leve onde é suportado, mp4 cobre o Safari mais velho. Ausente = fica só a imagem.
   */
  video?: { webm?: string; mp4: string };
};

/**
 * Mídia do navegador falso de cada variante.
 *
 * As imagens são telas reais do produto, em português e no tema escuro, com duas
 * regiões borradas antes de entrarem no repositório: o rodapé da barra lateral, que
 * mostrava o nome e o cargo de uma pessoa real logada, e as miniaturas do ranking, que
 * são anúncios de clientes com rostos identificáveis. Mesma política do
 * `public/examples/creative-ranking.jpg` que já estava no site.
 *
 * Para colocar a filmagem no ar: solte os arquivos em `public/examples/lp/` e acrescente
 * o `video` da variante aqui. Nada mais muda, e a imagem continua servindo de poster,
 * que é o quadro que aparece antes de o vídeo carregar e o que quem pediu menos
 * movimento no sistema vai ver no lugar dele.
 *
 * Se a mídia nova vier de uma conta real, passe o mesmo tratamento de borrão antes.
 */
export const TRIAL_LANDING_MEDIA: Record<TrialLandingFeature, TrialLandingMedia> = {
  cockpit: { image: "/examples/lp/cockpit.webp" },
  relatorios: { image: "/examples/lp/relatorios.webp" },
  criativos: { image: "/examples/lp/criativos.webp" }
};

/** Lê o `?feature=` da URL; qualquer coisa fora da lista vira a variante padrão. */
export function resolveTrialLandingFeature(
  value: string | string[] | undefined
): TrialLandingFeature {
  const raw = (Array.isArray(value) ? value[0] : value)?.trim().toLowerCase();
  const match = TRIAL_LANDING_FEATURES.find((feature) => feature === raw);
  return match ?? DEFAULT_TRIAL_LANDING_FEATURE;
}
