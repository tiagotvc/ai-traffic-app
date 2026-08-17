/**
 * Variantes das landing pages públicas por produto.
 *
 * O truque para ter message match com três anúncios diferentes sem manter três páginas:
 * a variante troca o herói, a imagem do produto e o bloco de prova, e o resto da página
 * é idêntico. Uma URL concentra o tráfego, a mensuração e o aprendizado; três URLs
 * dividiriam tudo por três.
 *
 * Valor desconhecido cai no cockpit, que é a promessa mais ampla, então um anúncio com
 * `feature` errado nunca quebra a página.
 */

export const TRIAL_LANDING_FEATURES = ["performance", "cockpit", "relatorios", "criativos"] as const;

export type TrialLandingFeature = (typeof TRIAL_LANDING_FEATURES)[number];

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
  performance: {
    image: "/examples/lp/cockpit.webp",
    video: { mp4: "/examples/lp/cockpit.mp4" }
  },
  cockpit: {
    image: "/examples/lp/cockpit.webp",
    video: { mp4: "/examples/lp/cockpit.mp4" }
  },
  relatorios: {
    image: "/examples/lp/relatorios.webp",
    video: { mp4: "/examples/lp/relatorios.mp4" }
  },
  criativos: {
    image: "/examples/lp/criativos.webp",
    video: { mp4: "/examples/lp/criativos.mp4" }
  }
};

