import type { ResearchLogEntry } from "@/lib/agency-brain/insights/types";

const SHARED_SCAN_DETAILS = {
  niche: "Moda fitness feminina",
  marketCountry: "BR",
  searchTerms: [
    "moda fitness feminina",
    "legging compressão",
    "moda fitness promo",
    "frete grátis fitness"
  ],
  competitors: [
    { name: "GymWear BR", adsFound: 14 },
    { name: "ActiveLife Store", adsFound: 11 },
    { name: "FitPro Oficial", adsFound: 9 }
  ],
  adSamples: [
    {
      advertiser: "GymWear BR",
      hook: "Últimas unidades — 40% OFF só hoje",
      format: "video",
      cta: "Comprar agora",
      daysRunning: 38,
      libraryUrl: "https://www.facebook.com/ads/library/"
    },
    {
      advertiser: "ActiveLife Store",
      hook: "Depoimento: perdi 8kg com a rotina dela",
      format: "video",
      cta: "Saiba mais",
      daysRunning: 52,
      libraryUrl: "https://www.facebook.com/ads/library/"
    },
    {
      advertiser: "FitPro Oficial",
      hook: "Legging compressão — prova em 30 dias",
      format: "image",
      cta: "Comprar agora",
      daysRunning: 21
    },
    {
      advertiser: "GymWear BR",
      hook: "Frete grátis acima de R$ 99",
      format: "carousel",
      cta: "Comprar agora",
      daysRunning: 15
    }
  ],
  topHooks: [
    { hook: "Últimas unidades — 40% OFF só hoje", count: 8, avgDays: 34 },
    { hook: "Depoimento: perdi 8kg com a rotina dela", count: 6, avgDays: 48 },
    { hook: "Frete grátis acima de R$ 99", count: 5, avgDays: 19 }
  ],
  topCtas: [
    { cta: "Comprar agora", count: 22 },
    { cta: "Saiba mais", count: 8 },
    { cta: "Enviar mensagem", count: 4 }
  ]
};

/** Demo logs shown until the client runs a real refine. */
export const MOCK_RESEARCH_LOGS: ResearchLogEntry[] = [
  {
    id: "log-seed-1",
    clientId: "__demo__",
    type: "refine",
    title: "Refinar pesquisas",
    detail: "Pipeline completo: Biblioteca Meta + padrões + IA de campanhas + síntese.",
    status: "success",
    pointsUsed: 2,
    adsAnalyzed: 34,
    patternsFound: 3,
    learningsCreated: 2,
    marketInsights: 1,
    details: {
      ...SHARED_SCAN_DETAILS,
      dateRange: "últimos 30 dias",
      campaignPatterns: [
        {
          label: "CPA caiu 24% em público novo",
          detail: "Campanha Conversão · conjunto Interesse Fitness 25-45"
        },
        {
          label: "CTR +17% com hook NOVO ZAP",
          detail: "Campanha Captação · 3 conjuntos ativos"
        }
      ],
      aiSuggestions: [
        {
          title: "UGC com prova social reduz CPA",
          body: "6 campanhas com vídeo UGC vs estúdio — CPA −17%"
        },
        {
          title: "Público novo vs lookalike antigo",
          body: "CPA −24% migrando budget para interesses novos"
        }
      ],
      synthesisItems: [
        {
          title: "Prova social no hook domina o nicho",
          body: "68% dos top anúncios abrem com depoimento ou resultado em 3s."
        }
      ]
    },
    createdAt: "2025-06-10T14:22:00.000Z"
  },
  {
    id: "log-seed-2",
    clientId: "__demo__",
    type: "market_scan",
    title: "Escaneou Biblioteca Meta",
    detail: "34 anúncios ativos no nicho · 3 concorrentes rastreados.",
    status: "success",
    adsAnalyzed: 34,
    details: SHARED_SCAN_DETAILS,
    createdAt: "2025-06-10T14:22:01.000Z"
  },
  {
    id: "log-seed-3",
    clientId: "__demo__",
    type: "ai_analysis",
    title: "Análise IA — campanhas Meta Ads",
    detail: "2 aprendizados sugeridos a partir das métricas dos últimos 30 dias.",
    status: "success",
    pointsUsed: 1,
    learningsCreated: 2,
    details: {
      dateRange: "últimos 30 dias",
      campaignsAnalyzed: [
        "Conversão — Interesse Fitness",
        "Captação — NOVO ZAP",
        "Remarketing — Carrinho"
      ],
      aiSuggestions: [
        {
          title: "UGC com prova social reduz CPA em conversão",
          body: "CPA médio R$ 42 vs R$ 51 em criativos de estúdio (−17%)"
        },
        {
          title: "Público novo performando melhor que LAL 1%",
          body: "CPA R$ 38 vs R$ 50 · frequência LAL antigo 4,2"
        }
      ]
    },
    createdAt: "2025-06-08T09:15:00.000Z"
  },
  {
    id: "log-seed-4",
    clientId: "__demo__",
    type: "pattern_detect",
    title: "Detectou padrões nas campanhas",
    detail: "Regras automáticas encontraram 1 padrão de CPA em conjuntos ativos.",
    status: "success",
    patternsFound: 1,
    details: {
      dateRange: "últimos 7 dias",
      campaignPatterns: [
        {
          label: "Queda de CPA em público Interesse Fitness 25-45",
          detail: "CPA −24% vs lookalike 1% · 3 campanhas · spend R$ 12,4k"
        }
      ],
      campaignsAnalyzed: ["Conversão — Interesse Fitness", "Conversão — LAL 1% 180d"]
    },
    createdAt: "2025-06-07T16:40:00.000Z"
  },
  {
    id: "log-seed-5",
    clientId: "__demo__",
    type: "market_synthesis",
    title: "Síntese IA de mercado",
    detail: "1 insight consolidado a partir dos padrões da Biblioteca Meta.",
    status: "success",
    pointsUsed: 1,
    marketInsights: 1,
    details: {
      synthesisItems: [
        {
          title: "Vídeo UGC com depoimento nos 3s lidera o nicho",
          body: "Padrão presente em 68% dos anúncios com +30 dias no ar."
        },
        {
          title: "CTA 'Comprar agora' saturando — testar 'Garantia 30 dias'",
          body: "22 de 34 anúncios usam o mesmo CTA direto."
        }
      ]
    },
    createdAt: "2025-06-05T11:00:00.000Z"
  }
];
