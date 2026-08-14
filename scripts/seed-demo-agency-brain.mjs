import "dotenv/config";
import pg from "pg";
import { randomUUID } from "crypto";

/**
 * Popula o "Cérebro da agência" dos clientes demo: aprendizados, hipóteses,
 * sugestões, DNA, experimentos, plano de ação, regras, alertas e histórico.
 *
 * Uso:
 *   node scripts/seed-demo-agency-brain.mjs                 # só clientes ainda sem conteúdo
 *   node scripts/seed-demo-agency-brain.mjs --tenant=<uuid>
 *   node scripts/seed-demo-agency-brain.mjs --force         # regrava mesmo quem já tem
 *
 * Rode DEPOIS de scripts/seed-demo-agency-clients.mjs (depende dos clientes).
 */

const args = process.argv.slice(2);
const argTenant = args.find((a) => a.startsWith("--tenant="))?.slice("--tenant=".length);
const FORCE = args.includes("--force");

const NOW = new Date();
function daysAgo(n, hour = 10) {
  const d = new Date(NOW);
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(hour, Math.floor(Math.random() * 60), 0, 0);
  return d;
}
function daysAhead(n, hour = 9) {
  return daysAgo(-n, hour);
}
function dateOnly(d) {
  return d.toISOString().slice(0, 10);
}

function mulberry32(seed) {
  return function rng() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

// ---------------------------------------------------------------------------
// Conteúdo por cliente (nomes de campanha batem com scripts/seed-demo-agency-clients.mjs)
// ---------------------------------------------------------------------------

const CLIENTS = [
  {
    slug: "doutor-a",
    name: "Doutor A (Clínica de Estética)",
    seed: 5001,
    campaigns: {
      "captacao-avaliacao": "Captação de Leads | Avaliação Facial Gratuita",
      "remarketing-orcamento": "Remarketing | Fechamento de Orçamento",
      "lancamento-harmonizacao": "Lançamento | Harmonização Facial Premium"
    },
    learnings: [
      { title: "Criativos com antes/depois reduzem CPL em 32%", category: "CREATIVE", impact: "HIGH", confidence: "HIGH", desc: "Nos últimos 14 dias, anúncios em carrossel com antes/depois geraram CPL de R$18,40 contra R$27,10 da média da conta. A prova visual reduz fricção na decisão de agendar avaliação." },
      { title: "Público lookalike 1% supera interesse amplo 'estética'", category: "AUDIENCE", impact: "HIGH", confidence: "MEDIUM", desc: "O conjunto Lookalike 1% | Clientes converte 1,6x mais que o público de interesses amplos, com CPA 28% menor." },
      { title: "CTA 'Agende sua avaliação gratuita' converte melhor que 'Saiba mais'", category: "COPY", impact: "MEDIUM", confidence: "MEDIUM", desc: "Testes A/B de texto mostraram alta de 19% no CTR ao trocar o CTA genérico por uma oferta explícita de avaliação gratuita." },
      { title: "Horário 18h-21h concentra os leads mais qualificados", category: "SEASONALITY", impact: "MEDIUM", confidence: "MEDIUM", desc: "Leads gerados no fim de tarde/início de noite têm taxa de comparecimento 22% maior que os da manhã." },
      { title: "Campanha de remarketing satura acima de R$35/dia", category: "BUDGET", impact: "LOW", confidence: "MEDIUM", desc: "Aumentos de orçamento acima de R$35/dia na campanha de remarketing não trouxeram queda proporcional de CPA, sinal de público pequeno." },
      { title: "Formulário nativo do Meta reduz custo por lead em 15%", category: "LANDING_PAGE", impact: "MEDIUM", confidence: "HIGH", desc: "Comparado à landing page externa, o formulário instantâneo do Meta reduziu o custo por lead e aumentou a taxa de preenchimento." }
    ],
    hypotheses: [
      { title: "Anúncio em vídeo curto (15s) vai superar o carrossel estático", category: "CREATIVE", status: "TESTING", desc: "Hipótese de que um vídeo mostrando o procedimento em 15s aumenta a taxa de retenção e reduz CPL frente ao carrossel atual." },
      { title: "Segmentar só mulheres 30-45 melhora a qualidade do lead", category: "AUDIENCE", status: "CONFIRMED", desc: "Restringir a faixa etária para 30-45 anos (hoje 25-45) deve elevar a taxa de comparecimento sem reduzir volume de forma crítica." },
      { title: "Oferecer parcelamento em 12x aumenta conversão do orçamento", category: "OFFER", status: "SUGGESTED", desc: "Divulgar parcelamento em até 12x no anúncio de remarketing pode reduzir a objeção de preço no fechamento." },
      { title: "Depoimento em vídeo de paciente real reduz CPA da campanha de lançamento", category: "CREATIVE", status: "SUGGESTED", desc: "Um depoimento autêntico deve gerar mais confiança que a peça institucional atual da harmonização facial." }
    ],
    suggestions: [
      { title: "Escalar orçamento da campanha de Avaliação Facial em 20%", actionType: "scale_budget", priority: "HIGH", status: "PENDING", desc: "ROAS da campanha subiu para 7,5x nas últimas 2 semanas com CPA estável, há espaço para escalar sem perder eficiência." },
      { title: "Pausar público 'Interesses | Estética e Beleza' no fim de semana", actionType: "pause_campaign", priority: "MEDIUM", status: "PENDING", desc: "O conjunto tem CPL 40% mais alto aos sábados e domingos comparado a dias úteis." },
      { title: "Duplicar Lookalike 1% para 2% e testar volume", actionType: "duplicate_audience", priority: "MEDIUM", status: "ACKNOWLEDGED", desc: "Testar um lookalike mais amplo para escalar volume mantendo parte da qualidade do público atual." },
      { title: "Atualizar criativo da campanha de Lançamento após 18 dias no ar", actionType: "refresh_creative", priority: "LOW", status: "EXECUTED", desc: "Frequência acima de 3,2, sinal de fadiga criativa no público principal." },
      { title: "Criar regra automática para pausar CPA acima de R$70", actionType: "create_automation_rule", priority: "HIGH", status: "PENDING", desc: "Simulação do Orion Engine mostra economia estimada de orçamento sem perda relevante de leads.", actionPayload: { simulationSummary: { days: 30, campaignsTriggered: 2, avoidedSpend: 640.5, dailyBudgetIncrease: 0 } } }
    ],
    dna: {
      summaryText: "Clínica de estética consolidada: performa melhor com prova social visual (antes/depois), remarketing enxuto e ofertas de avaliação gratuita. Público de interesse amplo satura rápido; lookalike de clientes é o motor de escala.",
      audiences: { works: ["Lookalike 1% | Clientes", "Mulheres 30-45 anos"], doesntWork: ["Interesses amplos 'estética' sem refinamento"] },
      creatives: { works: ["Carrossel antes/depois", "Vídeo curto do procedimento"], doesntWork: ["Peça institucional sem prova social"] },
      offers: { works: ["Avaliação facial gratuita", "Parcelamento em destaque"], doesntWork: [] },
      copy: { works: ["CTA direto 'Agende sua avaliação'"], doesntWork: ["CTA genérico 'Saiba mais'"] },
      placements: { works: ["Feed Instagram", "Reels"], doesntWork: ["Audience Network"] },
      seasonality: { works: ["Leads 18h-21h"], doesntWork: ["Leads de manhã cedo"] }
    },
    experiments: [
      { title: "Vídeo 15s vs. Carrossel antes/depois", variantA: "Vídeo 15s do procedimento", variantB: "Carrossel antes/depois (atual)", winner: "B", conclusion: "Carrossel manteve CPL 12% menor mesmo após 3 semanas de teste. O vídeo será revisitado com novo roteiro.", status: "completed" },
      { title: "Formulário instantâneo vs. Landing page própria", variantA: "Formulário instantâneo Meta", variantB: "Landing page própria", winner: null, conclusion: null, status: "running" }
    ],
    actionPlan: {
      title: "Plano de crescimento | Agosto/Setembro",
      items: [
        { title: "Subir orçamento da campanha de Avaliação Facial em 20%", status: "done" },
        { title: "Gravar depoimento em vídeo com paciente real", status: "pending" },
        { title: "Testar parcelamento em 12x no anúncio de remarketing", status: "pending" },
        { title: "Atualizar criativo principal (fadiga acima de freq. 3,2)", status: "done" },
        { title: "Criar regra automática de pausa por CPA alto", status: "pending" }
      ]
    },
    automationRules: [
      { name: "Pausar campanhas com CPA acima de R$70", actionType: "pause_campaign", metric: "cpa", op: "gt", value: 70, executionMode: "auto" },
      { name: "Avisar quando ROAS cair abaixo de 3x", actionType: "notify_email", metric: "roas", op: "lt", value: 3, executionMode: "alert" }
    ],
    personaSeed: "estetica"
  },
  {
    slug: "cliente-b",
    name: "Cliente B (Clínica de Estética)",
    seed: 5002,
    campaigns: {
      "captacao-corporal": "Captação de Leads | Avaliação Corporal",
      "promo-drenagem": "Promoção | Drenagem Linfática",
      "nova-unidade-crio": "Nova Unidade | Pacotes Criolipólise"
    },
    learnings: [
      { title: "Pacote de 10 sessões converte 2x mais que sessão avulsa", category: "OFFER", impact: "HIGH", confidence: "HIGH", desc: "Anúncios que destacam o pacote fechado têm CPL menor e ticket médio maior que os que oferecem sessão avulsa." },
      { title: "Público feminino 22-35 domina os agendamentos efetivos", category: "AUDIENCE", impact: "MEDIUM", confidence: "MEDIUM", desc: "Apesar do público configurado ser 22-40, mais de 70% dos agendamentos vêm da faixa 22-35." },
      { title: "Depoimento em texto tem desempenho pior que imagem de resultado", category: "CREATIVE", impact: "MEDIUM", confidence: "MEDIUM", desc: "Peças com foto de resultado (com autorização) convertem mais que texto puro de depoimento." },
      { title: "Campanha de nova unidade tem CPL decrescente nas 3 primeiras semanas", category: "SEASONALITY", impact: "MEDIUM", confidence: "HIGH", desc: "Efeito clássico de curva de aprendizado: a otimização automática do Meta reduziu CPL em 35% do dia 1 ao dia 21." },
      { title: "Oferta 'primeira sessão com 50% off' gera leads pouco qualificados", category: "OFFER", impact: "LOW", confidence: "MEDIUM", desc: "Apesar do volume alto, a taxa de comparecimento desses leads é 40% menor que a média." }
    ],
    hypotheses: [
      { title: "Reduzir desconto de 50% para 30% deve elevar a qualidade do lead", category: "OFFER", status: "TESTING", desc: "Um desconto mais moderado deve filtrar melhor o interesse real sem matar o volume." },
      { title: "Adicionar depoimento em vídeo da unidade nova aumenta confiança local", category: "CREATIVE", status: "SUGGESTED", desc: "Mostrar a estrutura física da nova unidade pode reduzir a objeção de 'não conheço o lugar'." },
      { title: "Segmentar raio de 5km da nova unidade melhora comparecimento", category: "AUDIENCE", status: "CONFIRMED", desc: "Leads dentro do raio de 5km têm taxa de comparecimento 26% maior que leads de fora da região." }
    ],
    suggestions: [
      { title: "Reduzir desconto da campanha de Drenagem para 30%", actionType: "review_campaign", priority: "MEDIUM", status: "PENDING", desc: "O desconto atual de 50% está trazendo leads de baixa intenção. Teste com desconto menor." },
      { title: "Escalar campanha Nova Unidade | Criolipólise em 25%", actionType: "scale_budget", priority: "HIGH", status: "PENDING", desc: "CPL em queda consistente há 3 semanas, momento ideal para escalar." },
      { title: "Atualizar imagens de resultado da campanha de captação corporal", actionType: "refresh_creative", priority: "LOW", status: "EXECUTED", desc: "Criativo principal está no ar há 25 dias, frequência acima de 3." },
      { title: "Criar regra automática de aumento gradual de orçamento", actionType: "create_automation_rule", priority: "MEDIUM", status: "PENDING", desc: "Simulação indica ganho de leads mantendo CPA sob controle.", actionPayload: { simulationSummary: { days: 30, campaignsTriggered: 1, avoidedSpend: 0, dailyBudgetIncrease: 180 } } }
    ],
    dna: {
      summaryText: "Clínica menor, focada em estética corporal. Pacotes fechados performam melhor que ofertas avulsas; a nova unidade se beneficia de segmentação geográfica apertada (raio de 5km).",
      audiences: { works: ["Mulheres 22-35 anos", "Raio 5km da unidade"], doesntWork: ["Público fora do raio de atuação"] },
      creatives: { works: ["Foto de resultado real"], doesntWork: ["Depoimento em texto puro"] },
      offers: { works: ["Pacote fechado de 10 sessões"], doesntWork: ["Desconto agressivo de 50% na primeira sessão"] },
      copy: { works: ["Destaque do pacote fechado"], doesntWork: [] },
      placements: { works: ["Feed Instagram", "Stories"], doesntWork: [] },
      seasonality: { works: ["Curva de aprendizado 21 dias"], doesntWork: [] }
    },
    experiments: [
      { title: "Desconto 50% vs. 30% na campanha de Drenagem", variantA: "50% off primeira sessão", variantB: "30% off primeira sessão", winner: null, conclusion: null, status: "running" }
    ],
    actionPlan: {
      title: "Plano de expansão | Nova Unidade",
      items: [
        { title: "Testar desconto reduzido (30%) na campanha de Drenagem", status: "pending" },
        { title: "Escalar orçamento da campanha de Criolipólise", status: "done" },
        { title: "Produzir fotos de resultado com autorização de clientes", status: "done" },
        { title: "Ajustar raio geográfico para 5km na campanha da nova unidade", status: "pending" }
      ]
    },
    automationRules: [
      { name: "Escalar orçamento gradual quando CPA cair", actionType: "adjust_budget_percent", metric: "cpa", op: "lt", value: 25, executionMode: "approval", budgetPercent: 15 }
    ],
    personaSeed: "estetica"
  },
  {
    slug: "cliente-c",
    name: "Cliente C (Climatização e Ar Condicionado)",
    seed: 5003,
    campaigns: {
      "instalacao-local": "Instalação de Ar Condicionado | Captação Local",
      "contratos-pj": "Manutenção Preventiva | Contratos PJ",
      "black-week-clima": "Black Week Climatização | Promoção de Instalação"
    },
    learnings: [
      { title: "Anúncios com preço de instalação a partir de X convertem mais", category: "OFFER", impact: "HIGH", confidence: "HIGH", desc: "Mostrar um valor de referência ('instalação a partir de R$450') reduz a fricção de orçamento e aumenta cliques qualificados." },
      { title: "Público de empresas e condomínios tem ticket médio 2,4x maior", category: "AUDIENCE", impact: "HIGH", confidence: "MEDIUM", desc: "Leads B2B (contratos PJ) convertem menos em volume, mas o ticket médio compensa amplamente o CPL mais alto." },
      { title: "Formulário com campo 'tipo de imóvel' melhora qualificação", category: "LANDING_PAGE", impact: "MEDIUM", confidence: "MEDIUM", desc: "Adicionar uma pergunta de qualificação no formulário reduziu leads não qualificados em 18%." },
      { title: "Campanha Black Week teve pico de CPL no primeiro fim de semana", category: "SEASONALITY", impact: "MEDIUM", confidence: "HIGH", desc: "Concorrência de outros anunciantes no período elevou o CPL temporariamente e normalizou na segunda semana." },
      { title: "Remarketing por formulário abandonado recupera 12% dos orçamentos", category: "AUDIENCE", impact: "MEDIUM", confidence: "MEDIUM", desc: "Público de quem iniciou mas não completou o formulário converte melhor que público frio." }
    ],
    hypotheses: [
      { title: "Vídeo mostrando instalação real aumenta confiança do lead residencial", category: "CREATIVE", status: "SUGGESTED", desc: "Mostrar o processo de instalação pode reduzir objeções sobre qualidade do serviço." },
      { title: "Segmentar por tipo de imóvel (comercial) melhora eficiência PJ", category: "AUDIENCE", status: "TESTING", desc: "Refinar o público de contratos PJ para excluir residências deve elevar a taxa de conversão." },
      { title: "Oferecer manutenção grátis nos primeiros 6 meses aumenta fechamento PJ", category: "OFFER", status: "SUGGESTED", desc: "Um incentivo de manutenção gratuita pode reduzir o ciclo de decisão em contratos empresariais." }
    ],
    suggestions: [
      { title: "Aumentar orçamento da campanha Contratos PJ em 25%", actionType: "scale_budget", priority: "HIGH", status: "PENDING", desc: "Ticket médio alto e CPA estável, com espaço para escalar o público B2B." },
      { title: "Pausar Black Week após queda de sazonalidade", actionType: "pause_campaign", priority: "MEDIUM", status: "EXECUTED", desc: "Campanha sazonal cumpriu o objetivo. Pausar para não desperdiçar orçamento fora do período." },
      { title: "Criar público de remarketing de formulário abandonado", actionType: "duplicate_audience", priority: "MEDIUM", status: "ACKNOWLEDGED", desc: "Ainda não existe um público dedicado para quem abandonou o formulário, uma oportunidade de recuperação." },
      { title: "Criar regra automática de pausa por gasto sem conversão", actionType: "create_automation_rule", priority: "HIGH", status: "PENDING", desc: "Simulação do Engine mostra economia relevante em dias de baixa performance.", actionPayload: { simulationSummary: { days: 30, campaignsTriggered: 3, avoidedSpend: 890, dailyBudgetIncrease: 0 } } }
    ],
    dna: {
      summaryText: "Prestador de serviço de climatização com duas frentes: captação local residencial (alto volume) e contratos PJ (alto ticket). Ofertas com preço de referência e qualificação no formulário reduzem desperdício de orçamento.",
      audiences: { works: ["Empresas e condomínios (PJ)", "Raio 10km"], doesntWork: ["Público amplo sem qualificação"] },
      creatives: { works: ["Preço de referência no anúncio"], doesntWork: ["Peça genérica sem valor"] },
      offers: { works: ["Manutenção preventiva com contrato"], doesntWork: [] },
      copy: { works: ["Preço 'a partir de' em destaque"], doesntWork: [] },
      placements: { works: ["Feed Facebook", "Marketplace"], doesntWork: [] },
      seasonality: { works: ["Pico de demanda em promoções sazonais"], doesntWork: ["Baixa demanda fora de promoção"] }
    },
    experiments: [
      { title: "Preço de referência vs. sem preço no anúncio", variantA: "Com preço 'a partir de R$450'", variantB: "Sem preço, só CTA", winner: "A", conclusion: "Mostrar preço de referência aumentou CTR em 24% e reduziu CPL, então foi mantido como padrão.", status: "completed" },
      { title: "Formulário com qualificação vs. formulário simples", variantA: "Com campo tipo de imóvel", variantB: "Formulário simples (nome/telefone)", winner: null, conclusion: null, status: "running" }
    ],
    actionPlan: {
      title: "Plano comercial | Captação PJ",
      items: [
        { title: "Escalar orçamento da campanha Contratos PJ", status: "pending" },
        { title: "Criar público de remarketing de formulário abandonado", status: "pending" },
        { title: "Pausar Black Week após período promocional", status: "done" },
        { title: "Testar oferta de manutenção gratuita nos 6 primeiros meses", status: "pending" }
      ]
    },
    automationRules: [
      { name: "Pausar anúncios com gasto sem conversão", actionType: "pause_campaign", metric: "spend_no_conversion", op: "gt", value: 150, executionMode: "auto" },
      { name: "Notificar quando CPL passar de R$90", actionType: "notify_email", metric: "cpl", op: "gt", value: 90, executionMode: "alert" }
    ],
    personaSeed: "servicos"
  },
  {
    slug: "cliente-d",
    name: "Cliente D (Academia em Rede)",
    seed: 5004,
    campaigns: {
      "matriculas-centro": "Matrículas | Unidade Centro",
      "matriculas-zona-sul": "Matrículas | Unidade Zona Sul",
      "inauguracao-zona-norte": "Inauguração | Unidade Zona Norte"
    },
    learnings: [
      { title: "Oferta 'primeira semana grátis' é o principal driver de matrícula", category: "OFFER", impact: "HIGH", confidence: "HIGH", desc: "Anúncios com essa oferta têm CPL 45% menor que anúncios só institucionais." },
      { title: "Vídeo do ambiente da academia supera foto estática", category: "CREATIVE", impact: "HIGH", confidence: "HIGH", desc: "Tours em vídeo pela estrutura convertem mais que fotos isoladas de equipamentos." },
      { title: "Raio de 5km captura mais de 80% das matrículas efetivas", category: "AUDIENCE", impact: "HIGH", confidence: "HIGH", desc: "Independente da unidade, quase todas as matrículas vêm de dentro de um raio de 5km. Proximidade é decisiva." },
      { title: "Campanha de inauguração tem melhor desempenho nos primeiros 30 dias", category: "SEASONALITY", impact: "MEDIUM", confidence: "MEDIUM", desc: "O efeito de novidade da nova unidade gera CPL menor logo após a abertura, subindo depois de 30-40 dias." },
      { title: "Lookalike de alunos ativos converte melhor que interesse 'fitness'", category: "AUDIENCE", impact: "MEDIUM", confidence: "MEDIUM", desc: "O público lookalike baseado em alunos ativos tem CPA 20% menor que interesses genéricos de fitness." },
      { title: "Matrícula com taxa zerada aumenta volume mas reduz ticket médio", category: "OFFER", impact: "LOW", confidence: "MEDIUM", desc: "A oferta de taxa zerada aumenta conversão mas costuma vir acompanhada de planos mais curtos." }
    ],
    hypotheses: [
      { title: "Ampliar raio para 7km na Zona Sul mantém CPL aceitável", category: "AUDIENCE", status: "TESTING", desc: "A unidade Zona Sul tem menor densidade populacional, então ampliar o raio pode compensar sem perder muito CPL." },
      { title: "Oferta de personal trainer grátis no 1º mês aumenta ticket médio", category: "OFFER", status: "SUGGESTED", desc: "Um incentivo de maior valor percebido pode atrair um perfil de aluno disposto a planos mais longos." },
      { title: "Novo criativo com depoimento de aluno reduz CPA na campanha de inauguração", category: "CREATIVE", status: "CONFIRMED", desc: "Depoimentos reais de alunos aumentaram a taxa de conversão do formulário em 18% na nova unidade." }
    ],
    suggestions: [
      { title: "Escalar orçamento da campanha de Inauguração Zona Norte", actionType: "scale_budget", priority: "HIGH", status: "PENDING", desc: "Efeito de novidade ainda ativo, momento de maior eficiência da campanha." },
      { title: "Testar raio de 7km na campanha da Zona Sul", actionType: "review_campaign", priority: "MEDIUM", status: "PENDING", desc: "Densidade populacional menor na região pode justificar um raio maior." },
      { title: "Atualizar vídeo institucional da Unidade Centro", actionType: "refresh_creative", priority: "LOW", status: "EXECUTED", desc: "Criativo principal está há mais de 30 dias no ar com frequência elevada." },
      { title: "Duplicar Lookalike de alunos ativos para as 3 unidades", actionType: "duplicate_audience", priority: "MEDIUM", status: "ACKNOWLEDGED", desc: "O público de melhor performance na Unidade Centro ainda não foi replicado nas outras campanhas." },
      { title: "Criar regra automática de escala para campanha de inauguração", actionType: "create_automation_rule", priority: "HIGH", status: "PENDING", desc: "Simulação mostra oportunidade de aumento de orçamento com ganho proporcional de matrículas.", actionPayload: { simulationSummary: { days: 21, campaignsTriggered: 1, avoidedSpend: 0, dailyBudgetIncrease: 320 } } }
    ],
    dna: {
      summaryText: "Rede de academias com 3 unidades. Proximidade geográfica (raio de 5km) e oferta de entrada (semana grátis) são os maiores drivers. Vídeo do ambiente supera fotos; inaugurações têm janela curta de alta eficiência.",
      audiences: { works: ["Raio 5km da unidade", "Lookalike de alunos ativos"], doesntWork: ["Interesse genérico 'fitness'"] },
      creatives: { works: ["Vídeo tour da estrutura", "Depoimento de aluno real"], doesntWork: ["Foto isolada de equipamento"] },
      offers: { works: ["Primeira semana grátis", "Taxa de matrícula zerada"], doesntWork: [] },
      copy: { works: ["CTA de urgência (vagas limitadas na inauguração)"], doesntWork: [] },
      placements: { works: ["Reels", "Feed Instagram"], doesntWork: [] },
      seasonality: { works: ["Janela de 30 dias pós-inauguração"], doesntWork: ["Após 40 dias sem novo estímulo"] }
    },
    experiments: [
      { title: "Vídeo tour vs. foto de equipamentos", variantA: "Vídeo tour da estrutura", variantB: "Fotos de equipamentos", winner: "A", conclusion: "Vídeo tour reduziu CPL em 28% e foi adotado como criativo padrão para novas campanhas.", status: "completed" },
      { title: "Raio 5km vs. 7km na Zona Sul", variantA: "Raio 5km (atual)", variantB: "Raio 7km", winner: null, conclusion: null, status: "running" }
    ],
    actionPlan: {
      title: "Plano de expansão | 3 unidades",
      items: [
        { title: "Escalar orçamento da campanha de inauguração", status: "done" },
        { title: "Testar raio de 7km na Zona Sul", status: "pending" },
        { title: "Replicar Lookalike de alunos ativos para todas unidades", status: "pending" },
        { title: "Atualizar vídeo institucional da Unidade Centro", status: "done" },
        { title: "Planejar oferta de personal trainer grátis no 1º mês", status: "pending" }
      ]
    },
    automationRules: [
      { name: "Escalar orçamento da campanha de inauguração", actionType: "scale_budget", metric: "roas", op: "gt", value: 8, executionMode: "approval" },
      { name: "Reduzir orçamento se CTR cair abaixo de 1%", actionType: "adjust_budget_percent", metric: "ctr", op: "lt", value: 1, executionMode: "alert", budgetPercent: -15 }
    ],
    personaSeed: "fitness"
  },
  {
    slug: "cliente-e",
    name: "Cliente E (Odontologia e Implantes)",
    seed: 5005,
    campaigns: {
      "implantes-avaliacao": "Implantes | Avaliação com Raio-X Gratuito",
      "clareamento-whatsapp": "Clareamento Dental | Atendimento no WhatsApp",
      "ortodontia-invisivel": "Ortodontia Invisível | Captação Premium"
    },
    learnings: [
      { title: "Antes e depois do sorriso é o criativo de maior retorno", category: "CREATIVE", impact: "HIGH", confidence: "HIGH", desc: "O criativo com resultado real de implante tem CPL 34% menor que a média da conta e sustenta desempenho há mais de 90 dias sem sinal de fadiga." },
      { title: "Foto do consultório não gera lead qualificado", category: "CREATIVE", impact: "MEDIUM", confidence: "HIGH", desc: "A peça institucional com a estrutura da clínica ficou 40% acima do CPL médio em todos os conjuntos onde rodou. Foi retirada da rotação." },
      { title: "Raio-X gratuito é a oferta que destrava o agendamento", category: "OFFER", impact: "HIGH", confidence: "MEDIUM", desc: "A oferta de exame sem custo reduz a objeção inicial de preço e antecipa o paciente para dentro da clínica, onde a taxa de fechamento é muito maior." },
      { title: "Público 35-60 concentra o ticket alto de implante", category: "AUDIENCE", impact: "HIGH", confidence: "HIGH", desc: "Leads acima de 35 anos respondem por 78% dos orçamentos de implante fechados, mesmo representando pouco mais da metade do volume." },
      { title: "Clareamento funciona melhor no WhatsApp que em formulário", category: "LANDING_PAGE", impact: "MEDIUM", confidence: "MEDIUM", desc: "O atendimento direto pelo WhatsApp encurta o ciclo do procedimento de menor valor, onde o paciente decide rápido." }
    ],
    hypotheses: [
      { title: "Vídeo do passo a passo do implante reduz a objeção de dor", category: "CREATIVE", status: "TESTING", desc: "Mostrar o procedimento sem sensacionalismo deve reduzir o medo, que é a principal objeção registrada pela recepção." },
      { title: "Simulação do sorriso final aumenta a conversão em ortodontia", category: "CREATIVE", status: "CONFIRMED", desc: "O carrossel com a simulação do resultado elevou a taxa de preenchimento do formulário na campanha premium." },
      { title: "Separar campanha por procedimento melhora o CPA de cada um", category: "AUDIENCE", status: "SUGGESTED", desc: "Hoje implante e ortodontia disputam o mesmo público. Separar deve dar controle de orçamento por linha de serviço." }
    ],
    suggestions: [
      { title: "Escalar a campanha de implantes em 25%", actionType: "scale_budget", priority: "HIGH", status: "PENDING", desc: "CPA estável há 4 semanas e fila de avaliação com folga na agenda. É o momento de aumentar o investimento." },
      { title: "Retirar o criativo do consultório da rotação", actionType: "refresh_creative", priority: "MEDIUM", status: "EXECUTED", desc: "A peça está 40% acima do CPL médio e consumindo orçamento dos criativos que performam." },
      { title: "Criar público de quem falou no WhatsApp e não fechou", actionType: "duplicate_audience", priority: "MEDIUM", status: "PENDING", desc: "O clareamento tem muita conversa iniciada sem fechamento. Esse público merece uma campanha própria de recuperação." },
      { title: "Criar regra de pausa por CPA acima de R$180", actionType: "create_automation_rule", priority: "HIGH", status: "PENDING", desc: "A simulação indica economia relevante nos dias de pico de concorrência.", actionPayload: { simulationSummary: { days: 30, campaignsTriggered: 2, avoidedSpend: 1120, dailyBudgetIncrease: 0 } } }
    ],
    dna: {
      summaryText: "Clínica odontológica com duas frentes de valor bem diferentes: implante (ticket alto, ciclo longo, decide por confiança) e clareamento (ticket baixo, decide rápido, fecha no WhatsApp). Prova visual de resultado é o que sustenta a conta.",
      audiences: { works: ["Adultos 35-60", "Lookalike 1% de pacientes"], doesntWork: ["Público amplo sem recorte de idade"] },
      creatives: { works: ["Antes e depois do sorriso", "Vídeo explicativo do procedimento"], doesntWork: ["Foto do consultório", "Peça institucional"] },
      offers: { works: ["Raio-X gratuito na avaliação", "Parcelamento sem juros"], doesntWork: ["Desconto genérico sem contexto"] },
      copy: { works: ["Falar do resultado, não da técnica"], doesntWork: ["Termos clínicos que o paciente não entende"] },
      placements: { works: ["Feed Instagram", "Reels"], doesntWork: ["Audience Network"] },
      seasonality: { works: ["Início de mês para ticket alto"], doesntWork: ["Última semana do mês"] }
    },
    experiments: [
      { title: "Antes e depois vs. vídeo explicativo", variantA: "Antes e depois do sorriso", variantB: "Vídeo do passo a passo", winner: "A", conclusion: "A prova de resultado venceu com folga em CPL. O vídeo segue como apoio no remarketing.", status: "completed" },
      { title: "Formulário vs. WhatsApp no clareamento", variantA: "Formulário no site", variantB: "Conversa no WhatsApp", winner: null, conclusion: null, status: "running" }
    ],
    actionPlan: {
      title: "Plano trimestral de captação odontológica",
      items: [
        { title: "Escalar orçamento da campanha de implantes", status: "done" },
        { title: "Produzir 3 novos antes e depois com autorização do paciente", status: "pending" },
        { title: "Separar ortodontia em campanha própria", status: "pending" },
        { title: "Tirar o criativo do consultório da rotação", status: "done" }
      ]
    },
    automationRules: [
      { name: "Pausar quando o CPA passar de R$180", actionType: "pause_campaign", metric: "cpa", op: "gt", value: 180, executionMode: "auto" },
      { name: "Avisar quando o CPL do clareamento subir", actionType: "notify_email", metric: "cpl", op: "gt", value: 60, executionMode: "alert" }
    ],
    personaSeed: "odonto"
  },
  {
    slug: "cliente-f",
    name: "Cliente F (Imobiliária de Lançamentos)",
    seed: 5006,
    campaigns: {
      "lancamento-torre-a": "Lançamento | Torre A (2 e 3 dormitórios)",
      "carteira-remarketing": "Remarketing | Carteira de Interessados",
      "marca-institucional": "Institucional | Reconhecimento da Marca"
    },
    learnings: [
      { title: "Tour virtual do decorado é o criativo que sustenta a conta", category: "CREATIVE", impact: "HIGH", confidence: "HIGH", desc: "O vídeo do apartamento decorado tem CPL 36% menor que a média e é o único criativo que mantém desempenho depois de 60 dias no ar." },
      { title: "Render de fachada não converte", category: "CREATIVE", impact: "MEDIUM", confidence: "HIGH", desc: "A imagem da fachada foi o pior criativo em todos os conjuntos. O comprador quer ver o interior, não o prédio de fora." },
      { title: "Lead imobiliário precisa de remarketing longo", category: "AUDIENCE", impact: "HIGH", confidence: "HIGH", desc: "O ciclo de decisão passa de 45 dias. A campanha de carteira responde por boa parte das visitas agendadas, mesmo com orçamento menor." },
      { title: "Mostrar planta e metragem filtra o lead certo", category: "CREATIVE", impact: "MEDIUM", confidence: "MEDIUM", desc: "O carrossel com plantas reduz o volume bruto de leads, mas eleva a taxa de visita agendada por lead." },
      { title: "Campanha institucional não deve ser medida por CPL", category: "SEASONALITY", impact: "LOW", confidence: "MEDIUM", desc: "A campanha de marca serve para alcance e assistência de conversão. Cobrar CPL dela leva a decisão errada de corte." }
    ],
    hypotheses: [
      { title: "Destacar a entrada facilitada aumenta o volume de leads", category: "OFFER", status: "TESTING", desc: "A condição de entrada parcelada pode reduzir a principal objeção do público de 2 dormitórios." },
      { title: "Segmentar por bairro melhora o custo por visita agendada", category: "AUDIENCE", status: "SUGGESTED", desc: "Concentrar o investimento nos bairros de onde já vieram visitas deve elevar a eficiência do funil inteiro." },
      { title: "Corretor no vídeo gera mais confiança que narração", category: "CREATIVE", status: "CONFIRMED", desc: "O tour apresentado por uma pessoa teve retenção maior que a versão só com música e legenda." }
    ],
    suggestions: [
      { title: "Aumentar o orçamento do remarketing de carteira", actionType: "scale_budget", priority: "HIGH", status: "PENDING", desc: "É a campanha com melhor custo por visita agendada e está limitada por orçamento, não por público." },
      { title: "Tirar o render de fachada do ar", actionType: "refresh_creative", priority: "MEDIUM", status: "EXECUTED", desc: "Pior criativo da conta em todos os conjuntos onde rodou." },
      { title: "Revisar a meta da campanha institucional", actionType: "review_campaign", priority: "LOW", status: "ACKNOWLEDGED", desc: "A campanha de marca precisa ser avaliada por alcance e frequência, não por custo por lead." },
      { title: "Criar regra de escala para o remarketing", actionType: "create_automation_rule", priority: "MEDIUM", status: "PENDING", desc: "Subir orçamento automaticamente enquanto o custo por lead se mantiver abaixo do teto.", actionPayload: { simulationSummary: { days: 30, campaignsTriggered: 1, avoidedSpend: 0, dailyBudgetIncrease: 450 } } }
    ],
    dna: {
      summaryText: "Imobiliária de lançamento com ciclo de decisão longo. O topo de funil precisa de vídeo de interior, e o resultado real aparece no remarketing da carteira. Medir só o primeiro clique subestima o que funciona.",
      audiences: { works: ["Carteira de interessados", "Região metropolitana com renda compatível"], doesntWork: ["Público amplo sem filtro de renda"] },
      creatives: { works: ["Tour virtual do decorado", "Plantas e metragens"], doesntWork: ["Render de fachada", "Logo e slogan sozinhos"] },
      offers: { works: ["Entrada facilitada", "Últimas unidades"], doesntWork: [] },
      copy: { works: ["Metragem e número de dormitórios explícitos"], doesntWork: ["Linguagem publicitária vaga"] },
      placements: { works: ["Feed Instagram", "Stories"], doesntWork: ["Audience Network"] },
      seasonality: { works: ["Fins de semana para agendamento de visita"], doesntWork: ["Feriados prolongados"] }
    },
    experiments: [
      { title: "Tour do decorado vs. render de fachada", variantA: "Tour virtual do decorado", variantB: "Render da fachada", winner: "A", conclusion: "O tour venceu em todos os recortes. A fachada foi descontinuada como criativo principal.", status: "completed" },
      { title: "Entrada facilitada vs. preço fechado", variantA: "Entrada facilitada em destaque", variantB: "Preço total em destaque", winner: null, conclusion: null, status: "running" }
    ],
    actionPlan: {
      title: "Plano de vendas da Torre A",
      items: [
        { title: "Escalar remarketing de carteira", status: "pending" },
        { title: "Gravar tour do decorado com corretor apresentando", status: "done" },
        { title: "Retirar render de fachada da rotação", status: "done" },
        { title: "Testar segmentação por bairro", status: "pending" }
      ]
    },
    automationRules: [
      { name: "Escalar remarketing enquanto o CPL estiver baixo", actionType: "adjust_budget_percent", metric: "cpa", op: "lt", value: 90, executionMode: "approval", budgetPercent: 20 },
      { name: "Avisar quando a frequência passar de 4", actionType: "notify_email", metric: "frequency", op: "gt", value: 4, executionMode: "alert" }
    ],
    personaSeed: "imobiliaria"
  },
  {
    slug: "cliente-g",
    name: "Cliente G (E-commerce de Moda)",
    seed: 5007,
    campaigns: {
      "vendas-catalogo": "Vendas | Catálogo Coleção Nova",
      "remarketing-carrinho": "Remarketing | Carrinho Abandonado",
      "promo-liquidacao": "Liquidação de Estação | Até 60% Off"
    },
    learnings: [
      { title: "Carrinho abandonado é a campanha de maior ROAS da conta", category: "AUDIENCE", impact: "HIGH", confidence: "HIGH", desc: "O remarketing de carrinho entrega ROAS consistentemente acima do dobro da campanha de aquisição, com uma fração do orçamento." },
      { title: "Vídeo de provador vende mais que foto de estúdio", category: "CREATIVE", impact: "HIGH", confidence: "HIGH", desc: "Ver a peça em movimento resolve a dúvida de caimento, que é a principal razão de abandono no e-commerce de moda." },
      { title: "Foto única de modelo em estúdio tem o pior retorno", category: "CREATIVE", impact: "MEDIUM", confidence: "HIGH", desc: "O criativo estático de estúdio ficou abaixo da metade do ROAS médio da conta e foi aposentado." },
      { title: "Frete grátis acima de R$199 eleva o ticket médio", category: "OFFER", impact: "MEDIUM", confidence: "MEDIUM", desc: "A régua de frete empurra o carrinho para cima e melhora a margem por pedido, mesmo com o custo do frete." },
      { title: "Catálogo dinâmico escala melhor que criativo manual", category: "CREATIVE", impact: "HIGH", confidence: "MEDIUM", desc: "O carrossel dinâmico de produtos mantém o desempenho com muito menos manutenção de criativo por coleção." }
    ],
    hypotheses: [
      { title: "Cupom de 10% no carrinho aumenta o ROAS líquido", category: "OFFER", status: "TESTING", desc: "O desconto pode recuperar mais carrinhos do que custa em margem. Ainda falta fechar o cálculo com o time comercial." },
      { title: "Avaliações de clientes no criativo reduzem o abandono", category: "CREATIVE", status: "SUGGESTED", desc: "Prova social pode resolver a insegurança de comprar de uma marca que a pessoa ainda não conhece." },
      { title: "Lookalike de compradores recentes bate o público de interesses", category: "AUDIENCE", status: "CONFIRMED", desc: "O lookalike sobre a base de compradores entregou ROAS maior que qualquer público de interesse de moda." }
    ],
    suggestions: [
      { title: "Escalar o catálogo dinâmico em 30%", actionType: "scale_budget", priority: "HIGH", status: "PENDING", desc: "ROAS acima da meta com estoque disponível na coleção nova." },
      { title: "Aposentar a foto de estúdio", actionType: "refresh_creative", priority: "MEDIUM", status: "EXECUTED", desc: "Pior ROAS da conta, consumindo verba dos criativos vencedores." },
      { title: "Separar liquidação da campanha de coleção nova", actionType: "review_campaign", priority: "MEDIUM", status: "PENDING", desc: "Misturar preço cheio e liquidação no mesmo público derruba o ticket médio da aquisição." },
      { title: "Criar regra de pausa por ROAS abaixo de 2", actionType: "create_automation_rule", priority: "HIGH", status: "PENDING", desc: "Proteger a margem em dias de pico de custo de mídia.", actionPayload: { simulationSummary: { days: 30, campaignsTriggered: 2, avoidedSpend: 1780, dailyBudgetIncrease: 0 } } }
    ],
    dna: {
      summaryText: "E-commerce de moda que vive de dois motores: catálogo dinâmico para escalar aquisição e remarketing de carrinho para colher margem. Vídeo que mostra caimento é o formato que sustenta o ROAS.",
      audiences: { works: ["Carrinho abandonado 7 dias", "Lookalike 2% de compradores"], doesntWork: ["Interesses genéricos de moda"] },
      creatives: { works: ["Vídeo de provador", "Catálogo dinâmico"], doesntWork: ["Foto única de estúdio", "Banner só com preço"] },
      offers: { works: ["Frete grátis acima de R$199", "Cupom no carrinho"], doesntWork: ["Desconto permanente que vicia a base"] },
      copy: { works: ["Nome da peça e faixa de preço visíveis"], doesntWork: ["Copy de marca sem produto"] },
      placements: { works: ["Reels", "Feed Instagram", "Stories"], doesntWork: [] },
      seasonality: { works: ["Troca de estação", "Datas comerciais"], doesntWork: ["Semana seguinte a uma liquidação forte"] }
    },
    experiments: [
      { title: "Vídeo de provador vs. foto de estúdio", variantA: "Vídeo de provador", variantB: "Foto de estúdio", winner: "A", conclusion: "O vídeo dobrou o ROAS no público frio. A foto de estúdio saiu da rotação.", status: "completed" },
      { title: "Cupom de 10% vs. sem cupom no carrinho", variantA: "Com cupom de 10%", variantB: "Sem cupom", winner: null, conclusion: null, status: "running" }
    ],
    actionPlan: {
      title: "Plano de escala da coleção nova",
      items: [
        { title: "Escalar catálogo dinâmico", status: "done" },
        { title: "Gravar vídeo de provador para as 10 peças mais vendidas", status: "pending" },
        { title: "Separar liquidação em campanha própria", status: "pending" },
        { title: "Aposentar foto de estúdio", status: "done" }
      ]
    },
    automationRules: [
      { name: "Pausar quando o ROAS cair abaixo de 2", actionType: "pause_campaign", metric: "roas", op: "lt", value: 2, executionMode: "auto" },
      { name: "Escalar quando o ROAS passar de 6", actionType: "adjust_budget_percent", metric: "roas", op: "gt", value: 6, executionMode: "approval", budgetPercent: 20 }
    ],
    personaSeed: "ecommerce"
  },
  {
    slug: "cliente-h",
    name: "Cliente H (Pet Shop e Veterinária)",
    seed: 5008,
    campaigns: {
      "banho-tosa-whatsapp": "Banho e Tosa | Agendamento no WhatsApp",
      "consultas-veterinarias": "Consultas Veterinárias | Check-up Anual",
      "assinatura-racao": "Assinatura de Ração | Venda Recorrente"
    },
    learnings: [
      { title: "Antes e depois do banho é o criativo campeão", category: "CREATIVE", impact: "HIGH", confidence: "HIGH", desc: "O carrossel com o pet antes e depois do banho tem o menor custo por conversa iniciada da conta e não deu sinal de fadiga em 5 meses." },
      { title: "Foto da fachada da loja não gera agendamento", category: "CREATIVE", impact: "MEDIUM", confidence: "HIGH", desc: "A peça com a fachada ficou muito acima do custo por mensagem médio. O tutor decide pelo resultado no pet, não pelo endereço." },
      { title: "Cliente de banho e tosa vira cliente de consulta", category: "AUDIENCE", impact: "HIGH", confidence: "HIGH", desc: "O remarketing sobre a base do banho é o público mais barato para vender consulta veterinária, com custo por lead bem abaixo do público frio." },
      { title: "Raio de 6km é o limite prático do negócio", category: "AUDIENCE", impact: "MEDIUM", confidence: "HIGH", desc: "Fora desse raio o tutor não leva o pet com frequência, então o lead até chega mas não vira cliente recorrente." },
      { title: "Assinatura de ração precisa de base própria", category: "OFFER", impact: "MEDIUM", confidence: "MEDIUM", desc: "A venda recorrente performa muito melhor sobre quem já comprou na loja do que em público frio." }
    ],
    hypotheses: [
      { title: "Vídeo curto da tosa aumenta a confiança do tutor de primeira viagem", category: "CREATIVE", status: "TESTING", desc: "Mostrar o manejo cuidadoso do animal pode reduzir o receio de deixar o pet pela primeira vez." },
      { title: "Lembrete de vacina gera consulta recorrente", category: "OFFER", status: "SUGGESTED", desc: "Uma campanha sazonal de lembrete pode transformar consulta pontual em relacionamento anual." },
      { title: "Assinatura com 15% de desconto se paga na recorrência", category: "OFFER", status: "CONFIRMED", desc: "Mesmo com margem menor por pedido, o tempo de vida do cliente compensa o desconto de entrada." }
    ],
    suggestions: [
      { title: "Escalar banho e tosa em 20%", actionType: "scale_budget", priority: "HIGH", status: "PENDING", desc: "Custo por mensagem estável e agenda com espaço nos dias de semana." },
      { title: "Retirar a foto da fachada", actionType: "refresh_creative", priority: "MEDIUM", status: "EXECUTED", desc: "Criativo mais caro da conta em custo por conversa." },
      { title: "Criar campanha de lembrete de vacina", actionType: "review_campaign", priority: "MEDIUM", status: "PENDING", desc: "Oportunidade de recorrência que hoje não é trabalhada em mídia." },
      { title: "Criar regra de alerta de custo por mensagem", actionType: "create_automation_rule", priority: "MEDIUM", status: "PENDING", desc: "Avisar quando o custo por conversa passar do teto do serviço.", actionPayload: { simulationSummary: { days: 30, campaignsTriggered: 1, avoidedSpend: 320, dailyBudgetIncrease: 0 } } }
    ],
    dna: {
      summaryText: "Pet shop com clínica no mesmo endereço. O banho e tosa é a porta de entrada barata e a consulta veterinária é onde está a margem. Tudo gira em torno de um raio curto e de prova visual do cuidado com o animal.",
      audiences: { works: ["Raio 6km", "Base de clientes do banho e tosa"], doesntWork: ["Público fora do raio de atendimento"] },
      creatives: { works: ["Antes e depois do banho", "Vídeo curto da tosa"], doesntWork: ["Foto da fachada", "Foto da equipe posada"] },
      offers: { works: ["Agendamento direto no WhatsApp", "Assinatura com desconto"], doesntWork: [] },
      copy: { works: ["Falar com o tutor pelo nome do pet"], doesntWork: ["Linguagem institucional"] },
      placements: { works: ["Feed Instagram", "Stories"], doesntWork: [] },
      seasonality: { works: ["Fim de semana para banho", "Início do ano para check-up"], doesntWork: [] }
    },
    experiments: [
      { title: "Antes e depois vs. foto da fachada", variantA: "Antes e depois do banho", variantB: "Foto da fachada", winner: "A", conclusion: "Diferença grande o suficiente para encerrar o teste antes do prazo. A fachada saiu do ar.", status: "completed" },
      { title: "Assinatura com 15% vs. sem desconto", variantA: "Com 15% de desconto", variantB: "Preço cheio", winner: null, conclusion: null, status: "running" }
    ],
    actionPlan: {
      title: "Plano de recorrência do pet shop",
      items: [
        { title: "Escalar banho e tosa", status: "done" },
        { title: "Gravar vídeo curto do manejo na tosa", status: "pending" },
        { title: "Montar campanha de lembrete de vacina", status: "pending" },
        { title: "Retirar foto da fachada", status: "done" }
      ]
    },
    automationRules: [
      { name: "Avisar quando o custo por mensagem passar de R$12", actionType: "notify_email", metric: "cpmsg", op: "gt", value: 12, executionMode: "alert" },
      { name: "Pausar anúncio com gasto sem conversa", actionType: "pause_campaign", metric: "spend_no_conversion", op: "gt", value: 80, executionMode: "auto" }
    ],
    personaSeed: "pet"
  },
  {
    slug: "cliente-i",
    name: "Cliente I (Curso Online de Idiomas)",
    seed: 5009,
    campaigns: {
      "captacao-aula-gratis": "Captação | Aula Gratuita de Inglês",
      "matricula-turma": "Matrículas | Turma Nova (Vendas)",
      "conteudo-topo": "Topo de Funil | Conteúdo e Alcance"
    },
    learnings: [
      { title: "Depoimento de aluno fluente é o criativo que vende", category: "CREATIVE", impact: "HIGH", confidence: "HIGH", desc: "Na campanha de matrícula, o depoimento real entrega o maior ROAS da conta. Prova de resultado vence qualquer argumento de método." },
      { title: "Aula gratuita é o degrau obrigatório antes da venda", category: "OFFER", impact: "HIGH", confidence: "HIGH", desc: "Quem assiste a aula converte em matrícula a um custo muito menor que o público frio levado direto para a página de vendas." },
      { title: "Criativo genérico de bandeiras não funciona", category: "CREATIVE", impact: "MEDIUM", confidence: "HIGH", desc: "A peça com bandeiras e nomes de idiomas teve o pior CTR da conta. Não diz nada sobre o resultado que o aluno quer." },
      { title: "Reels de erro comum é o melhor topo de funil", category: "CREATIVE", impact: "MEDIUM", confidence: "MEDIUM", desc: "O conteúdo de erros de pronúncia alcança muito mais gente por real investido e alimenta o remarketing da aula gratuita." },
      { title: "Turma com vaga limitada acelera a decisão", category: "COPY", impact: "MEDIUM", confidence: "MEDIUM", desc: "A escassez real de vagas por turma encurta o tempo entre a aula gratuita e a matrícula." }
    ],
    hypotheses: [
      { title: "Aula gratuita ao vivo converte melhor que gravada", category: "OFFER", status: "TESTING", desc: "O formato ao vivo cria compromisso de agenda e pode elevar a taxa de comparecimento." },
      { title: "Segmentar por objetivo (viagem, carreira) melhora a copy", category: "AUDIENCE", status: "SUGGESTED", desc: "Falar com o motivo real do aluno deve superar a mensagem genérica de aprender inglês." },
      { title: "Remarketing de quem assistiu mais de 50% do reels tem ROAS alto", category: "AUDIENCE", status: "CONFIRMED", desc: "O público de retenção de vídeo já mostrou custo por matrícula abaixo do lookalike." }
    ],
    suggestions: [
      { title: "Escalar a campanha de matrícula em 25%", actionType: "scale_budget", priority: "HIGH", status: "PENDING", desc: "ROAS acima da meta com vagas ainda abertas na turma." },
      { title: "Aposentar o criativo de bandeiras", actionType: "refresh_creative", priority: "MEDIUM", status: "EXECUTED", desc: "Pior CTR da conta desde o início da campanha de captação." },
      { title: "Aumentar o investimento em topo de funil", actionType: "scale_budget", priority: "MEDIUM", status: "ACKNOWLEDGED", desc: "O reels de conteúdo abastece o remarketing e hoje está subfinanciado." },
      { title: "Criar regra de escala por ROAS na matrícula", actionType: "create_automation_rule", priority: "HIGH", status: "PENDING", desc: "Subir orçamento automaticamente enquanto a turma tiver vaga e o ROAS se sustentar.", actionPayload: { simulationSummary: { days: 21, campaignsTriggered: 1, avoidedSpend: 0, dailyBudgetIncrease: 520 } } }
    ],
    dna: {
      summaryText: "Curso online que vende por funil de dois passos: conteúdo e aula gratuita no topo, matrícula no remarketing. O criativo que converte é sempre prova de resultado de aluno real, nunca argumento de método.",
      audiences: { works: ["Assistiu a aula gratuita", "Retenção alta em vídeo"], doesntWork: ["Público frio levado direto à venda"] },
      creatives: { works: ["Depoimento de aluno fluente", "Reels de erro comum"], doesntWork: ["Bandeiras e idiomas", "Frase motivacional"] },
      offers: { works: ["Aula gratuita", "Turma com vaga limitada"], doesntWork: [] },
      copy: { works: ["Resultado concreto do aluno"], doesntWork: ["Promessa de fluência sem prazo"] },
      placements: { works: ["Reels", "Feed Instagram"], doesntWork: ["Audience Network"] },
      seasonality: { works: ["Início de semestre", "Janeiro"], doesntWork: ["Dezembro"] }
    },
    experiments: [
      { title: "Depoimento vs. grade do curso", variantA: "Depoimento de aluno fluente", variantB: "Grade do curso em carrossel", winner: "A", conclusion: "O depoimento venceu em ROAS e em custo por matrícula. A grade segue como apoio no meio do funil.", status: "completed" },
      { title: "Aula ao vivo vs. aula gravada", variantA: "Aula gratuita ao vivo", variantB: "Aula gratuita gravada", winner: null, conclusion: null, status: "running" }
    ],
    actionPlan: {
      title: "Plano de matrícula da turma nova",
      items: [
        { title: "Escalar campanha de matrícula", status: "done" },
        { title: "Gravar 3 depoimentos novos de alunos", status: "pending" },
        { title: "Aumentar verba do topo de funil", status: "pending" },
        { title: "Aposentar criativo de bandeiras", status: "done" }
      ]
    },
    automationRules: [
      { name: "Escalar matrícula enquanto o ROAS passar de 5", actionType: "scale_budget", metric: "roas", op: "gt", value: 5, executionMode: "approval" },
      { name: "Avisar quando o CTR do topo cair abaixo de 1%", actionType: "notify_email", metric: "ctr", op: "lt", value: 1, executionMode: "alert" }
    ],
    personaSeed: "educacao"
  }
];

const PERSONAS = [
  { name: "Mulheres em busca de procedimentos estéticos", description: "Foco em clínicas de estética facial/corporal, 25-45 anos.", ageMin: 25, ageMax: 45, gender: "female", sourcePrompt: "leads para clínica de estética com foco em avaliação gratuita" },
  { name: "Pacientes de alto ticket (harmonização/criolipólise)", description: "Perfil dispostos a pacotes fechados de maior valor.", ageMin: 28, ageMax: 50, gender: "female", sourcePrompt: "público para procedimentos estéticos de ticket alto" },
  { name: "Síndicos e gestores de condomínio", description: "Decisores de manutenção predial e climatização.", ageMin: 30, ageMax: 60, gender: "all", sourcePrompt: "público B2B para contratos de manutenção de ar condicionado" },
  { name: "Proprietários de imóvel residencial", description: "Interessados em instalação de ar condicionado residencial.", ageMin: 25, ageMax: 55, gender: "all", sourcePrompt: "público residencial para instalação de ar condicionado" },
  { name: "Interessados em iniciar na academia", description: "Perfil fitness iniciante, sensível a oferta de entrada.", ageMin: 18, ageMax: 40, gender: "all", sourcePrompt: "matrículas de academia com oferta de semana grátis" },
  { name: "Alunos lookalike de base ativa", description: "Semelhantes aos alunos já matriculados e engajados.", ageMin: 18, ageMax: 45, gender: "all", sourcePrompt: "lookalike de alunos ativos de academia" },
  { name: "Adultos com perda dentária", description: "Público de implante e prótese, decide por confiança e prova de resultado.", ageMin: 35, ageMax: 60, gender: "all", sourcePrompt: "captação de pacientes de implante dentário" },
  { name: "Compradores de primeiro imóvel", description: "Faixa de renda compatível com 2 dormitórios, ciclo de decisão longo.", ageMin: 28, ageMax: 45, gender: "all", sourcePrompt: "leads para lançamento imobiliário de 2 e 3 dormitórios" },
  { name: "Compradoras recorrentes de moda", description: "Base de compradoras do e-commerce, sensíveis a coleção nova e frete.", ageMin: 20, ageMax: 44, gender: "female", sourcePrompt: "lookalike de compradoras de e-commerce de moda" },
  { name: "Tutores de cães e gatos", description: "Moram perto da loja e levam o pet com frequência.", ageMin: 22, ageMax: 55, gender: "all", sourcePrompt: "agendamento de banho e tosa por WhatsApp" },
  { name: "Adultos que querem inglês para carreira", description: "Buscam resultado concreto, respondem a prova social de aluno.", ageMin: 20, ageMax: 45, gender: "all", sourcePrompt: "matrículas para curso online de inglês" }
];

const ZONES = [
  { name: "Raio 5km | Unidade Centro", description: "Zona de captação principal da unidade central.", geoRules: { cities: [{ key: "2643743", radius: 5, distanceUnit: "kilometer" }] } },
  { name: "Raio 5km | Zona Sul", description: "Zona de captação da unidade Zona Sul.", geoRules: { cities: [{ key: "2643744", radius: 5, distanceUnit: "kilometer" }] } },
  { name: "Grande São Paulo | Raio 10km", description: "Zona ampla para serviços de climatização residencial.", geoRules: { cities: [{ key: "455825", radius: 10, distanceUnit: "kilometer" }] } },
  { name: "Região Central | Raio 8km", description: "Zona de captação para clínicas de estética.", geoRules: { cities: [{ key: "455825", radius: 8, distanceUnit: "kilometer" }] } }
];

// ---------------------------------------------------------------------------
// Helpers de insert
// ---------------------------------------------------------------------------

async function insertOne(client, table, cols, values) {
  const placeholders = cols.map((_, i) => `$${i + 1}`);
  const sql = `INSERT INTO ${table} (${cols.map((c) => `"${c}"`).join(",")}) VALUES (${placeholders.join(",")}) ON CONFLICT DO NOTHING RETURNING id`;
  const res = await client.query(sql, values);
  return res.rows[0]?.id ?? null;
}

/** Descobre o tenant demo pelas contas `act_demo_*` já existentes. */
async function resolveTenantId(pgClient) {
  if (argTenant) return argTenant;
  if (process.env.DEMO_TENANT_ID) return process.env.DEMO_TENANT_ID;

  const res = await pgClient.query(
    `select c."tenantId", count(*)::int as accounts
       from ad_accounts a
       join clients c on c.id = a."clientId"
      where a."metaAdAccountId" ilike '%demo%'
      group by c."tenantId"
      order by accounts desc`
  );
  if (res.rows.length === 0) {
    throw new Error("Nenhum tenant com contas demo. Rode antes o seed-demo-agency-clients.mjs.");
  }
  if (res.rows.length > 1) {
    throw new Error(
      `Mais de um tenant com contas demo: ${res.rows.map((r) => r.tenantId).join(", ")}. Passe --tenant=<uuid>.`
    );
  }
  return res.rows[0].tenantId;
}

async function main() {
  const pgClient = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pgClient.connect();

  const TENANT_ID = await resolveTenantId(pgClient);
  const userRes = await pgClient.query(
    `select id from users where "tenantId" = $1 order by "createdAt" asc limit 1`,
    [TENANT_ID]
  );
  const USER_ID = userRes.rows[0]?.id ?? null;
  console.log(`Tenant: ${TENANT_ID} | usuário: ${USER_ID ?? "nenhum"}`);

  // Ad accounts (uuid do banco) por cliente
  const clientRows = await pgClient.query(
    `select id, name from clients where "tenantId" = $1`,
    [TENANT_ID]
  );
  const clientIdByName = new Map(clientRows.rows.map((r) => [r.name, r.id]));

  const accountRows = await pgClient.query(
    `select id, "clientId", "metaAdAccountId" from ad_accounts where "clientId" = any($1::uuid[])`,
    [clientRows.rows.map((r) => r.id)]
  );
  const accountByClientId = new Map(accountRows.rows.map((r) => [r.clientId, r]));

  let reportTemplateCount = 0;
  const reportTemplateIds = [];

  for (const spec of CLIENTS) {
    const clientId = clientIdByName.get(spec.name);
    if (!clientId) {
      console.warn(`Cliente não encontrado no tenant demo: ${spec.name}, pulando.`);
      continue;
    }
    const account = accountByClientId.get(clientId);
    if (!account) {
      console.warn(`Cliente sem conta de anúncio: ${spec.name}, pulando.`);
      continue;
    }

    // Idempotência: quem já tem conteúdo só é regravado com --force.
    if (!FORCE) {
      const existing = await pgClient.query(
        `select 1 from client_learnings where "clientId" = $1 limit 1`,
        [clientId]
      );
      if (existing.rows.length) {
        console.log(`\n== ${spec.name}: já tem conteúdo, pulando (use --force para regravar) ==`);
        continue;
      }
    }

    const rng = mulberry32(spec.seed);
    console.log(`\n== ${spec.name} (${clientId}) ==`);

    // ---- ClientLearning ----
    const learningIds = [];
    for (let i = 0; i < spec.learnings.length; i++) {
      const l = spec.learnings[i];
      const status = i < spec.learnings.length - 1 ? "APPROVED" : "SUGGESTED";
      const createdAt = daysAgo(150 - i * 20 - Math.floor(rng() * 10));
      const id = await insertOne(
        pgClient,
        "client_learnings",
        ["id", "createdAt", "updatedAt", "tenantId", "clientId", "title", "description", "category", "impact", "confidence", "source", "status", "tags"],
        [randomUUID(), createdAt, createdAt, TENANT_ID, clientId, l.title, l.desc, l.category, l.impact, l.confidence, "AI", status, JSON.stringify([l.category.toLowerCase()])]
      );
      if (id) learningIds.push({ id, createdAt, title: l.title });
    }

    // ---- ClientHypothesis ----
    const hypothesisIds = [];
    for (let i = 0; i < spec.hypotheses.length; i++) {
      const h = spec.hypotheses[i];
      const createdAt = daysAgo(120 - i * 18 - Math.floor(rng() * 10));
      const id = await insertOne(
        pgClient,
        "client_hypotheses",
        ["id", "createdAt", "updatedAt", "tenantId", "clientId", "title", "description", "category", "confidenceScore", "status", "source", "evidence"],
        [randomUUID(), createdAt, createdAt, TENANT_ID, clientId, h.title, h.desc, h.category, 40 + Math.floor(rng() * 40), h.status, "AI", JSON.stringify({ sampleSize: 500 + Math.floor(rng() * 3000), period: "14d" })]
      );
      if (id) hypothesisIds.push({ id, createdAt, title: h.title, status: h.status });
    }

    // ---- ClientActionSuggestion ----
    const suggestionIds = [];
    for (let i = 0; i < spec.suggestions.length; i++) {
      const s = spec.suggestions[i];
      const createdAt = daysAgo(90 - i * 14 - Math.floor(rng() * 8));
      const campKeys = Object.keys(spec.campaigns);
      const metaCampaignId = pick(rng, campKeys);
      const id = await insertOne(
        pgClient,
        "client_action_suggestions",
        ["id", "createdAt", "updatedAt", "tenantId", "clientId", "metaCampaignId", "title", "description", "actionType", "actionPayload", "source", "status", "priority"],
        [randomUUID(), createdAt, createdAt, TENANT_ID, clientId, metaCampaignId, s.title, s.desc, s.actionType, JSON.stringify(s.actionPayload ?? {}), "AI", s.status, s.priority]
      );
      if (id) suggestionIds.push({ id, createdAt, title: s.title, status: s.status, actionType: s.actionType });
    }

    // ---- ClientDna ----
    await insertOne(
      pgClient,
      "client_dna",
      ["id", "createdAt", "updatedAt", "tenantId", "clientId", "audiences", "creatives", "placements", "offers", "copy", "seasonality", "summaryText", "lastDerivedAt", "approvedLearningCount"],
      [
        randomUUID(), daysAgo(5), daysAgo(1), TENANT_ID, clientId,
        JSON.stringify(spec.dna.audiences), JSON.stringify(spec.dna.creatives), JSON.stringify(spec.dna.placements),
        JSON.stringify(spec.dna.offers), JSON.stringify(spec.dna.copy), JSON.stringify(spec.dna.seasonality),
        spec.dna.summaryText, daysAgo(1), learningIds.length
      ]
    );

    // ---- ClientExperiment ----
    for (let i = 0; i < spec.experiments.length; i++) {
      const e = spec.experiments[i];
      const createdAt = daysAgo(spec.experiments.length === 2 && i === 0 ? 70 : 25);
      await insertOne(
        pgClient,
        "client_experiments",
        ["id", "createdAt", "updatedAt", "tenantId", "clientId", "title", "variantA", "variantB", "winner", "conclusion", "horizonDays"],
        [randomUUID(), createdAt, e.status === "completed" ? daysAgo(10) : createdAt, TENANT_ID, clientId, e.title, e.variantA, e.variantB, e.winner, e.conclusion, 21]
      );
    }

    // ---- ClientActionPlan + Items ----
    const planId = randomUUID();
    const planCreatedAt = daysAgo(20);
    await insertOne(
      pgClient,
      "client_action_plans",
      ["id", "createdAt", "updatedAt", "tenantId", "clientId", "title", "generatedAt", "status"],
      [planId, planCreatedAt, planCreatedAt, TENANT_ID, clientId, spec.actionPlan.title, planCreatedAt, "active"]
    );
    for (let i = 0; i < spec.actionPlan.items.length; i++) {
      const it = spec.actionPlan.items[i];
      const createdAt = daysAgo(20 - i);
      await insertOne(
        pgClient,
        "client_action_plan_items",
        ["id", "createdAt", "updatedAt", "planId", "title", "status", "sortOrder"],
        [randomUUID(), createdAt, createdAt, planId, it.title, it.status, i]
      );
    }

    // ---- ClientTimelineEvent (derivado + eventos avulsos) ----
    const timelineEvents = [];
    for (const l of learningIds) {
      timelineEvents.push({ type: "learning_approved", title: `Aprendizado aprovado: ${l.title}`, createdAt: l.createdAt, sourceType: "client_learning", sourceId: l.id });
    }
    for (const h of hypothesisIds.filter((x) => x.status === "CONFIRMED")) {
      timelineEvents.push({ type: "hypothesis_confirmed", title: `Hipótese confirmada: ${h.title}`, createdAt: daysAgo(10), sourceType: "client_hypothesis", sourceId: h.id });
    }
    for (const s of suggestionIds.filter((x) => x.status === "EXECUTED")) {
      timelineEvents.push({ type: "suggestion_executed", title: `Ação executada: ${s.title}`, createdAt: s.createdAt, sourceType: "client_action_suggestion", sourceId: s.id });
    }
    for (let i = 0; i < 10; i++) {
      const kind = pick(rng, ["metric_spike", "sync_completed", "market_scanned"]);
      const createdAt = daysAgo(Math.floor(rng() * 170) + 3);
      const titles = {
        metric_spike: "Pico de performance detectado: ROAS acima da média",
        sync_completed: "Sincronização de métricas concluída",
        market_scanned: "Varredura de mercado/concorrentes concluída"
      };
      timelineEvents.push({ type: kind, title: titles[kind], createdAt, sourceType: null, sourceId: null });
    }
    for (const ev of timelineEvents) {
      await insertOne(
        pgClient,
        "client_timeline_events",
        ["id", "createdAt", "updatedAt", "tenantId", "clientId", "type", "title", "sourceType", "sourceId"],
        [randomUUID(), ev.createdAt, ev.createdAt, TENANT_ID, clientId, ev.type, ev.title, ev.sourceType, ev.sourceId]
      );
    }

    // ---- AutomationRule ----
    const ruleIds = [];
    for (const r of spec.automationRules) {
      const createdAt = daysAgo(60 + Math.floor(rng() * 40));
      const condition = { groups: [[{ metric: r.metric, op: r.op, value: r.value }]], minSpend: 30, windowDays: 7, consecutiveDays: 2 };
      const action = r.actionType === "notify_email"
        ? { type: r.actionType, recipientEmail: "demo@orionagency.app" }
        : r.actionType === "adjust_budget_percent"
          ? { type: r.actionType, budgetPercent: r.budgetPercent ?? 15 }
          : { type: r.actionType };
      const id = await insertOne(
        pgClient,
        "automation_rules",
        ["id", "createdAt", "updatedAt", "tenantId", "clientId", "name", "enabled", "condition", "action", "executionMode", "level"],
        [randomUUID(), createdAt, createdAt, TENANT_ID, clientId, r.name, true, JSON.stringify(condition), JSON.stringify(action), r.executionMode, "campaign"]
      );
      if (id) ruleIds.push({ id, name: r.name, actionType: r.actionType });
    }

    // ---- EngineExecution ----
    const campEntries = Object.entries(spec.campaigns);
    const engineStatuses = ["executed", "executed", "executed", "pending", "failed"];
    for (let i = 0; i < 10; i++) {
      const [metaCampaignId, campaignName] = pick(rng, campEntries);
      const rule = ruleIds.length ? pick(rng, ruleIds) : null;
      const status = pick(rng, engineStatuses);
      const createdAt = daysAgo(Math.floor(rng() * 150) + 2);
      const actionType = rule ? rule.actionType : pick(rng, ["pause_campaign", "adjust_budget_percent", "notify_email"]);
      const payload = actionType === "adjust_budget_percent" ? { budgetPercent: 15 } : actionType === "notify_email" ? { recipientEmail: "demo@orionagency.app" } : {};
      const result = status === "executed"
        ? actionType === "pause_campaign"
          ? { previousStatus: "ACTIVE", newStatus: "PAUSED" }
          : { applied: true }
        : null;
      await insertOne(
        pgClient,
        "engine_executions",
        ["id", "createdAt", "updatedAt", "tenantId", "clientId", "source", "automationRuleId", "metaCampaignId", "campaignName", "actionType", "payload", "description", "status", "result", "error", "executedAt"],
        [
          randomUUID(), createdAt, createdAt, TENANT_ID, clientId,
          rule ? "rule" : pick(rng, ["chat", "creator"]),
          rule?.id ?? null, metaCampaignId, campaignName, actionType, JSON.stringify(payload),
          rule ? `Regra "${rule.name}" avaliada para a campanha ${campaignName}` : `Ação ${actionType} sugerida para ${campaignName}`,
          status, result ? JSON.stringify(result) : null, status === "failed" ? "Timeout ao aplicar mudança na Meta API" : null,
          status === "executed" ? createdAt : null
        ]
      );
    }

    // ---- DomainEvent ----
    const domainEventPool = [
      { module: "engine", type: "engine.rule.created" },
      { module: "engine", type: "engine.action.executed" },
      { module: "engine", type: "engine.action.pending" },
      { module: "brain", type: "laboratory.learning.suggested" },
      { module: "brain", type: "brain.rule.suggested" },
      { module: "laboratory", type: "laboratory.hypothesis.suggested" },
      { module: "laboratory", type: "laboratory.experiment.completed" }
    ];
    for (let i = 0; i < 12; i++) {
      const ev = pick(rng, domainEventPool);
      const [metaCampaignId, campaignName] = pick(rng, campEntries);
      const createdAt = daysAgo(Math.floor(rng() * 160) + 2);
      await insertOne(
        pgClient,
        "domain_events",
        ["id", "createdAt", "updatedAt", "tenantId", "clientId", "module", "type", "payload"],
        [randomUUID(), createdAt, createdAt, TENANT_ID, clientId, ev.module, ev.type, JSON.stringify({ campaignName, metaCampaignId })]
      );
    }

    // ---- Alert ----
    const alertTypes = ["CPA_ABOVE_MAX", "ROAS_BELOW_MIN", "BUDGET_NEAR_LIMIT", "CTR_BELOW_MIN", "CONVERSION_DROP"];
    const usedDedup = new Set();
    let alertCount = 0;
    let attempts = 0;
    while (alertCount < 12 && attempts < 60) {
      attempts++;
      const type = pick(rng, alertTypes);
      const [metaCampaignId, campaignName] = pick(rng, campEntries);
      const dayOffset = Math.floor(rng() * 160) + 2;
      const createdAt = daysAgo(dayOffset);
      const dedupDay = dateOnly(createdAt);
      const dedupKey = `${type}:${metaCampaignId}:${dedupDay}`;
      if (usedDedup.has(dedupKey)) continue;
      usedDedup.add(dedupKey);
      const useAutomation = ruleIds.length && rng() > 0.5;
      const rule = useAutomation ? pick(rng, ruleIds) : null;
      const severity = pick(rng, ["critical", "critical", "warning"]);
      const { title, description, metricKey, actualValue, thresholdValue } = alertContent(type, campaignName, rng);
      const id = await insertOne(
        pgClient,
        "alerts",
        ["id", "createdAt", "updatedAt", "tenantId", "clientId", "metaCampaignId", "type", "severity", "title", "description", "metricKey", "actualValue", "thresholdValue", "dedupDay", "dismissed", "source", "automationRuleId"],
        [randomUUID(), createdAt, createdAt, TENANT_ID, clientId, metaCampaignId, type, severity, title, description, metricKey, actualValue, thresholdValue, dedupDay, rng() > 0.7, rule ? "automation" : "brain", rule?.id ?? null]
      );
      if (id) alertCount++;
    }

    // ---- AiRecommendation (Commander, histórico) ----
    const commanderQA = commanderHistory(spec, rng);
    for (const qa of commanderQA) {
      const createdAt = daysAgo(Math.floor(rng() * 100) + 1);
      await insertOne(
        pgClient,
        "ai_recommendations",
        ["id", "createdAt", "updatedAt", "tenantId", "clientId", "targetId", "actionType", "payload", "justification", "status", "creditsCharged"],
        [randomUUID(), createdAt, createdAt, TENANT_ID, clientId, "agency_brain", "COMMANDER_CHAT", JSON.stringify({ kind: "chat", question: qa.q, answer: qa.a }), qa.a.slice(0, 300), "APPLIED", 1 + Math.floor(rng() * 2)]
      );
    }

    // ---- ClientSavedTargeting ----
    await insertOne(
      pgClient,
      "client_saved_targeting",
      ["id", "createdAt", "updatedAt", "tenantId", "clientId", "metaAdAccountId", "name", "targeting"],
      [randomUUID(), daysAgo(80), daysAgo(80), TENANT_ID, clientId, account.metaAdAccountId, `Público principal | ${spec.name.split("(")[0].trim()}`, JSON.stringify({ geo_locations: { countries: ["BR"] }, age_min: 22, age_max: 45 })]
    );

    // ---- MetaAudienceCache (por conta) ----
    const audiencePool = [
      { subtype: "CUSTOM", label: "Visitantes do site (30 dias)" },
      { subtype: "CUSTOM", label: "Lista de clientes (upload)" },
      { subtype: "LOOKALIKE", label: "Lookalike 1% | Clientes" },
      { subtype: "ENGAGEMENT", label: "Engajaram com a Página (90 dias)" }
    ];
    const audiences = audiencePool.map((a, i) => ({
      id: `1202${clientId.slice(0, 6)}${i}`,
      name: a.label,
      subtype: a.subtype,
      approximate_count_lower_bound: 5000 + Math.floor(rng() * 20000),
      approximate_count_upper_bound: 8000 + Math.floor(rng() * 30000)
    }));
    await pgClient.query(
      `insert into meta_audience_cache (id, "metaAdAccountId", audiences, "fetchedAt")
       values ($1,$2,$3,$4)
       on conflict ("metaAdAccountId") do update set audiences = excluded.audiences, "fetchedAt" = excluded."fetchedAt"`,
      [randomUUID(), account.metaAdAccountId, JSON.stringify(audiences), daysAgo(2)]
    );

    // ---- AudienceInsightBreakdown ----
    const breakdowns = [
      ["age", "18-24"], ["age", "25-34"], ["age", "35-44"],
      ["gender", "female"], ["gender", "male"],
      ["region", "São Paulo"], ["region", "Rio de Janeiro"], ["region", "Minas Gerais"]
    ];
    for (const [breakdownType, breakdownValue] of breakdowns) {
      const spend = 200 + rng() * 1800;
      const conversions = Math.max(1, Math.round(spend / (60 + rng() * 60)));
      const roas = (2 + rng() * 8).toFixed(2);
      const cpa = (spend / conversions).toFixed(2);
      await insertOne(
        pgClient,
        "audience_insight_breakdowns",
        ["id", "createdAt", "updatedAt", "clientId", "metaAdAccountId", "breakdownType", "breakdownValue", "periodDays", "spend", "conversions", "roas", "cpa", "syncedAt"],
        [randomUUID(), daysAgo(1), daysAgo(1), clientId, account.metaAdAccountId, breakdownType, breakdownValue, 30, spend.toFixed(2), conversions, roas, cpa, daysAgo(1)]
      );
    }

    // ---- LookalikeJob ----
    await insertOne(
      pgClient,
      "lookalike_jobs",
      ["id", "createdAt", "updatedAt", "clientId", "metaAdAccountId", "name", "status", "seedType", "seedId", "ratio", "country", "metaAudienceId"],
      [randomUUID(), daysAgo(40), daysAgo(38), clientId, account.metaAdAccountId, "Lookalike 1% | Clientes", "completed", "customer_list", audiences[1].id, "0.01", "BR", `1203${clientId.slice(0, 6)}`]
    );

    // ---- ReportSchedule ----
    await insertOne(
      pgClient,
      "report_schedules",
      ["id", "createdAt", "updatedAt", "tenantId", "clientId", "name", "format", "deliveryChannel", "reportType", "periodPreset", "frequency", "dayOfWeek", "hourUtc", "recipients", "enabled", "lastRunAt", "nextRunAt"],
      [randomUUID(), daysAgo(60), daysAgo(60), TENANT_ID, clientId, `Relatório semanal | ${spec.name.split("(")[0].trim()}`, "pdf", "email_pdf", "complete", "last7", "weekly", 1, 12, JSON.stringify(["demo@orionagency.app"]), true, daysAgo(4), daysAhead(3)]
    );

    console.log(`  learnings=${learningIds.length} hipoteses=${hypothesisIds.length} sugestoes=${suggestionIds.length} regras=${ruleIds.length} alerts=${alertCount} timeline=${timelineEvents.length}`);
  }

  // ---- ReportTemplate (tenant-wide) ----
  const templates = [
    { name: "Relatório completo mensal", config: { reportType: "complete", metrics: ["spend", "conversions", "roas", "cpa"], periodPreset: "last30", chartStyle: "composed" } },
    { name: "Resumo semanal simples", config: { reportType: "simple", metrics: ["spend", "conversions"], periodPreset: "last7", chartStyle: "bar" } }
  ];
  for (const t of templates) {
    await insertOne(pgClient, "report_templates", ["id", "createdAt", "updatedAt", "tenantId", "name", "config"], [randomUUID(), daysAgo(90), daysAgo(90), TENANT_ID, t.name, JSON.stringify(t.config)]);
    reportTemplateCount++;
  }

  // ---- UserPersona / UserZone (tenant-wide) ----
  if (!USER_ID) {
    console.warn("Tenant sem usuário: personas e zonas não foram criadas.");
  }
  for (const p of USER_ID ? PERSONAS : []) {
    await insertOne(
      pgClient,
      "user_personas",
      ["id", "createdAt", "updatedAt", "tenantId", "userId", "name", "description", "ageMin", "ageMax", "gender", "targeting", "sourcePrompt"],
      [randomUUID(), daysAgo(100), daysAgo(100), TENANT_ID, USER_ID, p.name, p.description, p.ageMin, p.ageMax, p.gender, JSON.stringify({ genders: p.gender === "all" ? [] : p.gender === "female" ? [2] : [1], age_min: p.ageMin, age_max: p.ageMax }), p.sourcePrompt]
    );
  }
  for (const z of USER_ID ? ZONES : []) {
    await insertOne(
      pgClient,
      "user_zones",
      ["id", "createdAt", "updatedAt", "tenantId", "userId", "name", "description", "geoRules", "sourcePrompt"],
      [randomUUID(), daysAgo(100), daysAgo(100), TENANT_ID, USER_ID, z.name, z.description, JSON.stringify(z.geoRules), null]
    );
  }

  console.log(`\nReportTemplates criados: ${reportTemplateCount} | Personas: ${PERSONAS.length} | Zonas: ${ZONES.length}`);

  await pgClient.end();
}

function alertContent(type, campaignName, rng) {
  const map = {
    CPA_ABOVE_MAX: {
      title: "CPA acima do limite",
      description: `A campanha "${campaignName}" está com CPA acima do teto configurado.`,
      metricKey: "cpa", actualValue: (70 + rng() * 40).toFixed(2), thresholdValue: "70.00"
    },
    ROAS_BELOW_MIN: {
      title: "ROAS abaixo da meta",
      description: `A campanha "${campaignName}" caiu abaixo do ROAS mínimo esperado.`,
      metricKey: "roas", actualValue: (1 + rng() * 2).toFixed(2), thresholdValue: "3.00"
    },
    BUDGET_NEAR_LIMIT: {
      title: "Orçamento próximo do limite",
      description: `A campanha "${campaignName}" está consumindo quase todo o orçamento diário.`,
      metricKey: "spend", actualValue: (90 + rng() * 10).toFixed(2), thresholdValue: "100.00"
    },
    CTR_BELOW_MIN: {
      title: "CTR abaixo do esperado",
      description: `A campanha "${campaignName}" está com CTR abaixo da média histórica.`,
      metricKey: "ctr", actualValue: (0.4 + rng() * 0.4).toFixed(2), thresholdValue: "1.00"
    },
    CONVERSION_DROP: {
      title: "Queda nas conversões",
      description: `A campanha "${campaignName}" teve queda relevante de conversões nos últimos dias.`,
      metricKey: "conversions", actualValue: String(Math.floor(rng() * 5)), thresholdValue: "15"
    }
  };
  return map[type];
}

function commanderHistory(spec, rng) {
  const label = spec.name.split("(")[0].trim();
  const generic = [
    { q: `Quais campanhas do ${label} estão performando melhor essa semana?`, a: `A campanha com melhor ROAS essa semana é a que teve leads mais baratos. Recomendo escalar o orçamento em até 20% enquanto o CPA se mantiver estável.` },
    { q: `Vale a pena pausar a campanha com CPA mais alto?`, a: `Sim, se o CPA estiver 30% acima da média por mais de 3 dias consecutivos. Recomendo revisar criativo e público antes de reativar.` },
    { q: `Como está o ritmo de gasto comparado ao mês passado?`, a: `O ritmo de gasto está cerca de 25% acima do mês anterior, acompanhando o crescimento de conversões, e a eficiência (CPA) se manteve estável.` },
    { q: `Existe algum público novo que valha testar?`, a: `Sim. O lookalike baseado nos clientes mais recentes ainda não foi testado nas campanhas ativas e tem potencial de reduzir o CPA.` }
  ];
  return generic;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
