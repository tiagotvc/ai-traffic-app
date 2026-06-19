import type {
  InsightHypothesis,
  InsightLearning,
  LearningTimelineEvent
} from "@/lib/agency-brain/insights/types";

export const MOCK_LEARNINGS: InsightLearning[] = [
  {
    id: "lrn-ugc-cpa",
    title: "UGC com prova social reduz CPA em campanhas de conversão",
    description:
      "Vídeos UGC com depoimento nos primeiros 3s performaram melhor que criativos de estúdio nas campanhas de conversão do Meta Ads.",
    confidenceScore: 92,
    impactLevel: "high",
    status: "active",
    tags: ["UGC", "Prova social", "CPA", "Conversão"],
    evidenceSummary:
      "Cruzamento de 8 campanhas Meta Ads + 12 contas similares na agência + varredura de 34 anúncios ativos no mercado.",
    sources: [
      {
        type: "meta_ads",
        label: "Meta Ads",
        detail: "6 campanhas · CPA −17% vs estúdio · últimos 60 dias"
      },
      {
        type: "agency",
        label: "Contas similares",
        detail: "12 clientes do nicho · padrão UGC em 9 de 12"
      },
      {
        type: "market",
        label: "Varredura de mercado",
        detail: "34 anúncios ativos com hook de prova social no setor"
      },
      {
        type: "hypothesis",
        label: "Hipótese validada",
        detail: "Teste de 7 dias confirmou CPA −17%"
      }
    ],
    whyBelieves: [
      "Meta Ads: 6 campanhas com UGC tiveram CPA médio R$ 42 vs R$ 51 em estúdio (−17%).",
      "Agência: o mesmo padrão apareceu em 9 de 12 contas de e-commerce comparáveis.",
      "Mercado: 68% dos top anúncios do setor usam depoimento nos primeiros 3 segundos.",
      "Hipótese hyp-ugc-hook validada com CTR +14% e CPA estável."
    ],
    createdAt: "2025-03-13T10:00:00.000Z",
    updatedAt: "2025-05-10T14:30:00.000Z"
  },
  {
    id: "lrn-novo-zap-ctr",
    title: "\"NOVO ZAP\" parece melhorar CTR em campanhas de captação",
    description:
      "Campanhas com \"NOVO ZAP\" no nome do conjunto tiveram CTR 17% acima do baseline nas últimas 4 semanas no Meta Ads.",
    confidenceScore: 75,
    impactLevel: "medium",
    status: "active",
    tags: ["CTR", "Copy", "WhatsApp"],
    evidenceSummary: "3 campanhas Meta Ads ativas · CTR +17% · hook de urgência + canal direto.",
    sources: [
      {
        type: "meta_ads",
        label: "Meta Ads",
        detail: "3 campanhas · CTR 2,8% vs 2,4% baseline"
      },
      {
        type: "agency",
        label: "Padrão da agência",
        detail: "Mesmo hook em 4 outros clientes de captação"
      }
    ],
    whyBelieves: [
      "CTR médio 2,8% nas campanhas com NOVO ZAP vs 2,4% no restante do portfólio.",
      "Hook combina urgência (\"novo\") com canal direto (WhatsApp) — ressoa com o público 25–45.",
      "4 clientes de captação da agência usam variação similar com resultado positivo."
    ],
    createdAt: "2025-06-01T09:00:00.000Z",
    updatedAt: "2025-06-08T11:00:00.000Z"
  },
  {
    id: "lrn-audience-new",
    title: "Público novo performando melhor que lookalike antigo",
    description:
      "Públicos de interesse novos (Meta Ads) apresentaram CPA 24% menor e CTR 17% maior que lookalikes de 1% criados há mais de 6 meses.",
    confidenceScore: 88,
    impactLevel: "high",
    status: "active",
    tags: ["Público", "CPA", "Lookalike"],
    evidenceSummary:
      "3 campanhas Meta Ads · públicos novos vs lookalike 1% antigo · CPA −24% · CTR +17%.",
    sources: [
      {
        type: "meta_ads",
        label: "Meta Ads",
        detail: "3 campanhas conversão · CPA R$ 38 vs R$ 50 · CTR 3,1% vs 2,6%"
      },
      {
        type: "agency",
        label: "Benchmark agência",
        detail: "7 contas testaram público novo nos últimos 90 dias"
      },
      {
        type: "market",
        label: "Tendência de mercado",
        detail: "Saturação de LAL antigos reportada no setor Q2/2025"
      }
    ],
    whyBelieves: [
      "Meta Ads: conjuntos com público novo (interesse + comportamento) bateram LAL 1% antigo em CPA e CTR.",
      "Frequência do LAL antigo subiu para 4,2 — sinal clássico de saturação.",
      "7 contas da agência no mesmo nicho migraram para públicos novos com resultado similar.",
      "Relatórios de mercado apontam fadiga de lookalikes antigos em e-commerce D2C."
    ],
    createdAt: "2025-06-09T08:00:00.000Z",
    updatedAt: "2025-06-10T16:00:00.000Z"
  },
  {
    id: "lrn-offer-saturation",
    title: "Oferta promocional X mostra sinais de saturação",
    description:
      "Frequência acima de 4 e queda de CTR de 22% nas últimas 2 semanas sugerem fadiga da oferta em remarketing Meta Ads.",
    confidenceScore: 61,
    impactLevel: "medium",
    status: "weakening",
    tags: ["Oferta", "Saturação", "Frequência"],
    evidenceSummary:
      "Meta Ads remarketing · CTR −22% · frequência 4,3 · 3 concorrentes lançaram oferta similar.",
    sources: [
      {
        type: "meta_ads",
        label: "Meta Ads",
        detail: "Remarketing · CTR 1,9% → 1,5% · freq. 4,3"
      },
      {
        type: "competitor",
        label: "Concorrência",
        detail: "3 marcas lançaram promo similar em maio/2025"
      },
      {
        type: "market",
        label: "Sinal de mercado",
        detail: "Volume de busca pela oferta caiu 12% no Google Trends"
      }
    ],
    whyBelieves: [
      "CTR do remarketing caiu 22% com frequência média acima de 4.",
      "3 concorrentes diretos lançaram ofertas similares no mesmo período.",
      "Google Trends mostra queda de 12% no interesse pela keyword da oferta.",
      "Padrão típico de fadiga criativa/oferta em públicos quentes."
    ],
    createdAt: "2025-04-15T12:00:00.000Z",
    updatedAt: "2025-06-05T10:00:00.000Z"
  },
  {
    id: "lrn-landing-speed",
    title: "Landing pages rápidas correlacionam com menor CPA",
    description:
      "Páginas com LCP abaixo de 2,5s (PageSpeed) converteram 18% melhor em campanhas de lead no Meta Ads.",
    confidenceScore: 79,
    impactLevel: "high",
    status: "active",
    tags: ["Landing", "Performance", "CPA"],
    evidenceSummary:
      "5 landings comparadas · 2 com LCP < 2,5s · CPA −18% · dados Meta Ads + PageSpeed.",
    sources: [
      {
        type: "meta_ads",
        label: "Meta Ads",
        detail: "5 campanhas lead · CPA correlacionado com LCP"
      },
      {
        type: "agency",
        label: "Benchmark agência",
        detail: "Padrão replicado em 5 clientes de serviços"
      }
    ],
    whyBelieves: [
      "As 2 landings mais rápidas (LCP 1,8s e 2,1s) tiveram CPA 18% menor que as demais.",
      "Taxa de rejeição 34% menor nas páginas com LCP < 2,5s.",
      "Mesmo padrão observado em 5 clientes de serviços da agência."
    ],
    createdAt: "2025-05-20T14:00:00.000Z",
    updatedAt: "2025-06-07T09:00:00.000Z"
  }
];

export const MOCK_HYPOTHESES: InsightHypothesis[] = [
  {
    id: "hyp-ugc-3ads",
    learningId: "lrn-ugc-cpa",
    title: "Criar 3 anúncios UGC de até 20s com prova social nos primeiros 3 segundos",
    description:
      "Testar variações de vídeo UGC com depoimento ou prova social no hook inicial.",
    expectedOutcome: "Reduzir CPA em 15% nos próximos 7 dias.",
    targetMetric: "CPA",
    testPeriod: "7 dias",
    status: "testing",
    resultSummary: "Aguardando dados — 4 dias de teste concluídos. CPA −11% parcial.",
    executionPlan: [
      "Criar 3 variações de criativo UGC.",
      "Iniciar os vídeos com prova social.",
      "Rodar teste por 7 dias.",
      "Comparar CPA, CTR e taxa de conversão."
    ],
    createdAt: "2025-05-12T10:00:00.000Z",
    updatedAt: "2025-06-10T08:00:00.000Z"
  },
  {
    id: "hyp-ugc-hook",
    learningId: "lrn-ugc-cpa",
    title: "Testar prova social nos primeiros 3 segundos",
    description: "Isolar o efeito do hook de prova social em criativos existentes.",
    expectedOutcome: "Aumentar taxa de thumb-stop em 10%.",
    targetMetric: "CTR",
    testPeriod: "5 dias",
    status: "validated",
    resultSummary: "CTR subiu 14% vs controle. CPA manteve-se estável.",
    executionPlan: [
      "Duplicar criativos campeões.",
      "Adicionar prova social no início.",
      "Comparar com original."
    ],
    createdAt: "2025-04-20T11:00:00.000Z",
    updatedAt: "2025-05-10T14:30:00.000Z"
  },
  {
    id: "hyp-zap-copy",
    learningId: "lrn-novo-zap-ctr",
    title: "Replicar abordagem NOVO ZAP em novas campanhas",
    description: "Aplicar o mesmo padrão de naming e copy em 2 campanhas novas.",
    expectedOutcome: "Manter CTR acima do baseline por 14 dias.",
    targetMetric: "CTR",
    testPeriod: "14 dias",
    status: "pending",
    resultSummary: "Aguardando início do teste.",
    executionPlan: [
      "Identificar campanhas elegíveis.",
      "Criar variações com hook NOVO ZAP.",
      "Monitorar CTR diariamente."
    ],
    createdAt: "2025-06-09T15:00:00.000Z",
    updatedAt: "2025-06-09T15:00:00.000Z"
  },
  {
    id: "hyp-audience-expand",
    learningId: "lrn-audience-new",
    title: "Expandir públicos novos para 40% do budget",
    description: "Realocar budget de lookalikes antigos para públicos de interesse novos.",
    expectedOutcome: "Reduzir CPA geral em 10% sem perder volume.",
    targetMetric: "CPA",
    testPeriod: "10 dias",
    status: "testing",
    resultSummary: "Dia 3 de 10 — CPA parcial −8%, volume estável.",
    executionPlan: [
      "Criar novos conjuntos com públicos testados.",
      "Reduzir budget em conjuntos saturados.",
      "Avaliar CPA e volume após 10 dias."
    ],
    createdAt: "2025-06-10T10:00:00.000Z",
    updatedAt: "2025-06-10T10:00:00.000Z"
  }
];

export const MOCK_TIMELINE: LearningTimelineEvent[] = [
  {
    id: "tl-1",
    learningId: "lrn-ugc-cpa",
    date: "2025-03-13",
    title: "Padrão detectado no Meta Ads",
    description:
      "Brain identificou CPA 12% menor em 3 campanhas com vídeo UGC vs criativos de estúdio.",
    confidenceBefore: 54,
    confidenceAfter: 58,
    eventType: "created",
    sourceType: "meta_ads",
    sourceDetail: "3 campanhas · últimos 30 dias"
  },
  {
    id: "tl-2",
    learningId: "lrn-ugc-cpa",
    date: "2025-03-27",
    title: "Reforço em contas similares",
    description:
      "Mesmo padrão UGC confirmado em 4 clientes da agência com perfil de e-commerce.",
    confidenceBefore: 58,
    confidenceAfter: 67,
    eventType: "agency_pattern",
    sourceType: "agency",
    sourceDetail: "4 contas · nicho e-commerce"
  },
  {
    id: "tl-3",
    learningId: "lrn-ugc-cpa",
    date: "2025-04-18",
    title: "Varredura de mercado confirmou tendência",
    description:
      "34 anúncios ativos no setor usam prova social no hook — 68% dos top performers.",
    confidenceBefore: 67,
    confidenceAfter: 81,
    eventType: "market_signal",
    sourceType: "market",
    sourceDetail: "34 anúncios rastreados"
  },
  {
    id: "tl-4",
    learningId: "lrn-ugc-cpa",
    date: "2025-05-10",
    title: "Hipótese validada no Meta Ads",
    description: "Teste de prova social nos 3s: CTR +14%, CPA −17% vs controle.",
    confidenceBefore: 81,
    confidenceAfter: 92,
    eventType: "hypothesis_validated",
    sourceType: "hypothesis",
    sourceDetail: "hyp-ugc-hook · 5 dias de teste"
  },
  {
    id: "tl-5",
    learningId: "lrn-novo-zap-ctr",
    date: "2025-06-01",
    title: "CTR acima do baseline detectado",
    description:
      "Campanha \"Captação NOVO ZAP\" com CTR 2,9% vs média do portfólio 2,4%.",
    confidenceBefore: null,
    confidenceAfter: 62,
    eventType: "created",
    sourceType: "meta_ads",
    sourceDetail: "1 campanha · Meta Ads"
  },
  {
    id: "tl-6",
    learningId: "lrn-novo-zap-ctr",
    date: "2025-06-08",
    title: "Padrão reforçado em 2 campanhas",
    description: "Mais 2 campanhas com NOVO ZAP confirmaram CTR +15% em média.",
    confidenceBefore: 62,
    confidenceAfter: 75,
    eventType: "reinforced",
    sourceType: "meta_ads",
    sourceDetail: "3 campanhas total"
  },
  {
    id: "tl-7",
    learningId: "lrn-audience-new",
    date: "2025-06-09",
    title: "Divergência público novo vs LAL antigo",
    description:
      "Conjunto \"Interesse Fitness 25-45\" com CPA R$ 38 vs LAL 1% antigo R$ 50 (−24%).",
    confidenceBefore: null,
    confidenceAfter: 72,
    eventType: "created",
    sourceType: "meta_ads",
    sourceDetail: "Campanha Conversão · 14 dias"
  },
  {
    id: "tl-8",
    learningId: "lrn-audience-new",
    date: "2025-06-09",
    title: "Saturação do lookalike antigo",
    description: "Frequência do LAL 1% subiu para 4,2 com queda de CTR de 18%.",
    confidenceBefore: 72,
    confidenceAfter: 80,
    eventType: "client_pattern",
    sourceType: "meta_ads",
    sourceDetail: "Remarketing + conversão"
  },
  {
    id: "tl-9",
    learningId: "lrn-audience-new",
    date: "2025-06-10",
    title: "Benchmark da agência alinhado",
    description: "7 contas do nicho migraram para públicos novos com CPA −20% em média.",
    confidenceBefore: 80,
    confidenceAfter: 88,
    eventType: "agency_pattern",
    sourceType: "agency",
    sourceDetail: "7 contas · últimos 90 dias"
  },
  {
    id: "tl-10",
    learningId: "lrn-offer-saturation",
    date: "2025-04-15",
    title: "Queda de CTR no remarketing",
    description: "CTR do remarketing caiu de 2,4% para 1,9% em 2 semanas.",
    confidenceBefore: null,
    confidenceAfter: 55,
    eventType: "created",
    sourceType: "meta_ads",
    sourceDetail: "Remarketing · oferta X"
  },
  {
    id: "tl-11",
    learningId: "lrn-offer-saturation",
    date: "2025-05-20",
    title: "Concorrentes lançaram oferta similar",
    description: "3 marcas do setor ativaram promoções equivalentes em maio.",
    confidenceBefore: 55,
    confidenceAfter: 64,
    eventType: "competitor_signal",
    sourceType: "competitor",
    sourceDetail: "3 marcas rastreadas"
  },
  {
    id: "tl-12",
    learningId: "lrn-offer-saturation",
    date: "2025-06-05",
    title: "Sinal de enfraquecimento",
    description: "Google Trends: interesse pela oferta −12%. Frequência subiu para 4,3.",
    confidenceBefore: 64,
    confidenceAfter: 61,
    eventType: "weakened",
    sourceType: "market",
    sourceDetail: "Google Trends · Meta Ads freq."
  },
  {
    id: "tl-13",
    learningId: "lrn-landing-speed",
    date: "2025-05-20",
    title: "Correlação LCP × CPA detectada",
    description: "PageSpeed + Meta Ads: landings com LCP < 2,5s convertem 18% melhor.",
    confidenceBefore: null,
    confidenceAfter: 68,
    eventType: "created",
    sourceType: "meta_ads",
    sourceDetail: "5 campanhas lead"
  },
  {
    id: "tl-14",
    learningId: "lrn-landing-speed",
    date: "2025-06-01",
    title: "Padrão replicado na agência",
    description: "5 clientes de serviços com mesmo padrão LCP × conversão.",
    confidenceBefore: 68,
    confidenceAfter: 75,
    eventType: "agency_pattern",
    sourceType: "agency",
    sourceDetail: "5 clientes serviços"
  },
  {
    id: "tl-15",
    learningId: "lrn-landing-speed",
    date: "2025-06-07",
    title: "Confiança consolidada",
    description: "Otimização de 2 landings lentas gerou CPA −15% em 10 dias.",
    confidenceBefore: 75,
    confidenceAfter: 79,
    eventType: "reinforced",
    sourceType: "meta_ads",
    sourceDetail: "2 landings otimizadas"
  }
];
