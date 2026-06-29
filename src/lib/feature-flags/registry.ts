import type {
  FeatureFlagConfigMap,
  FeatureFlagContext,
  FeatureFlagEntry,
  FeatureNode,
  FeatureRolloutMode,
  ResolvedFeatureMap
} from "./types";

/**
 * Registry declarativo das feature flags de plataforma (admin, vale para todos).
 * Hierárquico: Módulo → Funcionalidade → sub-funcionalidade. Desligar um pai cascateia
 * nos filhos (ver `isFeatureEnabled` em ./service). Default de todo nó = ON.
 *
 * Hoje só o módulo **Brain** está populado. Para adicionar outros módulos (Dashboard,
 * Campanhas…), basta acrescentar nós aqui — a aplicação no produto é por módulo (sidebar,
 * gates de página e APIs).
 */
export const FEATURE_REGISTRY: FeatureNode[] = [
  {
    id: "visions",
    label: "Visões",
    description: "Dashboards editáveis (galeria e canvas de widgets).",
    children: [
      {
        id: "visions.canvas",
        label: "Canvas / galeria",
        description: "Criar, editar e abrir visões no builder de canvas."
      },
      {
        id: "visions.sharing",
        label: "Compartilhamento",
        description: "Publicar visão e gerar link compartilhável."
      },
      {
        id: "visions.ai-builder",
        label: "Builder IA",
        description: "Criação de widgets por IA no canvas."
      },
      {
        id: "visions.resize",
        label: "Redimensionar widgets",
        description: "Redimensionar e reposicionar widgets no grid."
      }
    ]
  },
  {
    id: "campaigns",
    label: "Campanhas",
    description: "Criador e gestão de campanhas Meta.",
    children: [
      {
        id: "campaigns.meta-app-development-notice",
        label: "Aviso app Meta em desenvolvimento",
        description:
          "Opção de reutilizar criativo importado no passo Anúncio (evita erro 1885183 com app em desenvolvimento)."
      },
      {
        id: "campaigns.brain",
        label: "Orion Brain no criador",
        description:
          "Insights, benchmarks e recomendações da memória da agência durante a criação de campanha.",
        children: [
          {
            id: "campaigns.brain.sidebar",
            label: "Dicas na sidebar",
            description: "Card Orion Brain na barra lateral do criador (dicas, modal e recomendações)."
          },
          {
            id: "campaigns.brain.insights",
            label: "Insights no passo Campanha",
            description: "Benchmark e feedback inline no passo de orçamento/campanha."
          },
          {
            id: "campaigns.brain.meta-research",
            label: "Pesquisa Meta Ad Library",
            description:
              "Consulta anúncios de concorrentes via Meta Ad Library ao montar o insight (consome créditos).",
            dependsOn: ["campaigns.brain.insights"]
          }
        ]
      },
      {
        id: "campaigns.ai-generate",
        label: "Gerar campanha por IA",
        description: "Modo assistido por IA: wizard de criação e preenchimento automático do rascunho."
      },
      {
        id: "campaigns.ai-copy",
        label: "Copy e criativos por IA",
        description: "Geração de textos de anúncio e variantes de criativo nos passos do criador."
      }
    ]
  },
  {
    id: "audiences",
    label: "Públicos",
    description: "Biblioteca de personas, zonas e criação com IA.",
    children: [
      {
        id: "audiences.ai-insights-preview",
        label: "Preview insights IA (criação de persona)",
        description:
          "Mostra cartões de resumo e insights da IA na criação de persona. Sem métricas fictícias de alcance."
      },
      {
        id: "audiences.personaInsights",
        label: "Persona — Insights & Comparação",
        description:
          "Compara a persona com dados reais da Meta (tamanho, demografia, validade dos segmentos) + recomendações por IA. Read-only."
      },
      {
        id: "audiences.personaTargetingBuilder",
        label: "Persona — editor de segmentos Meta",
        description:
          "Mostra a edição de segmentos Meta (interesses/comportamentos/demográficos) dentro do criador de persona. Desligue para concentrar segmentos no Criador de Públicos Meta."
      }
    ]
  },
  {
    id: "brain",
    label: "Agency Brain",
    description: "Módulo de inteligência/memória da agência.",
    children: [
      { id: "brain.learnings", label: "Aprendizados", description: "Feed e curadoria de aprendizados." },
      { id: "brain.hypotheses", label: "Hipóteses", description: "Hipóteses a testar e promover." },
      { id: "brain.suggestions", label: "Sugestões / Centro de ações" },
      { id: "brain.dna", label: "DNA do cliente" },
      { id: "brain.timeline", label: "Linha do tempo" },
      { id: "brain.labs", label: "Labs (pesquisa de mercado)" },
      { id: "brain.action-plans", label: "Planos de ação" },
      {
        id: "brain.chat",
        label: "Chat",
        description: "Assistente conversacional sobre a memória do cliente.",
        dependsOn: ["brain.learnings"]
      },
      { id: "brain.automations", label: "Automações" },
      {
        id: "brain.mcp",
        label: "Servidor MCP",
        description:
          "Expõe o Agency Brain via MCP (Model Context Protocol) para ferramentas de IA externas.",
        children: [
          {
            id: "brain.mcp.write",
            label: "MCP — ações de escrita",
            description: "Permite que o MCP execute ações (com confirmação). Padrão: só leitura."
          }
        ]
      }
    ]
  },
  {
    id: "reports",
    label: "Relatórios",
    description: "Geração de relatórios (clássico e com IA).",
    children: [
      {
        id: "reports.v1",
        label: "Relatório v1 (clássico, sem IA)",
        description: "Fluxo manual: KPIs, gráficos, breakdowns e export — sem IA."
      },
      {
        id: "reports.v2",
        label: "Relatório v2 (com IA)",
        description: "Gerar por IA, análise/insights por IA e destaques de anomalia."
      },
      {
        id: "reports.v3",
        label: "Relatório v3 (entrega ao cliente)",
        description: "Agendamento parametrizável + entrega automática ao cliente final.",
        children: [
          {
            id: "reports.v3.emailPdf",
            label: "Entrega: E-mail com PDF",
            description: "Envia o relatório em PDF anexo por e-mail."
          },
          {
            id: "reports.v3.emailLink",
            label: "Entrega: E-mail com link",
            description: "Envia e-mail com link público estável do relatório (ao vivo)."
          },
          {
            id: "reports.v3.whatsapp",
            label: "Entrega: WhatsApp",
            description: "Envia resumo + link via WhatsApp Business Cloud API (requer credenciais)."
          }
        ]
      }
    ]
  },
  {
    id: "scientists",
    label: "Cientistas (Labs)",
    description: "Agentes de pesquisa (cientistas). Ative/desative cada um individualmente (beta).",
    children: [
      {
        id: "scientists.competitor",
        label: "Marketing Scientist (concorrentes)",
        description:
          "Pesquisa concorrentes (Meta Ad Library) — hooks, ofertas e padrões de mercado. Alimenta a comparação automática da persona. Cache por nicho + teto mensal de searchapi.",
        children: [
          {
            id: "scientists.competitor.google",
            label: "Fonte: Google SERP (perguntas do público)",
            description: "Dúvidas reais e buscas relacionadas (dores/objeções). Consome 1 searchapi por nicho."
          },
          {
            id: "scientists.competitor.trends",
            label: "Fonte: Google Trends (buscas em alta)",
            description: "Ângulos emergentes/momentum do nicho. Consome 1 searchapi por nicho."
          },
          {
            id: "scientists.competitor.youtube",
            label: "Fonte: YouTube (concorrentes em vídeo)",
            description: "Principais vídeos/canais do nicho. Consome 1 searchapi por nicho."
          },
          {
            id: "scientists.competitor.maps",
            label: "Fonte: Google Maps (players locais)",
            description: "Concorrentes locais + reputação (★/avaliações). Consome 1 searchapi por nicho."
          }
        ]
      },
      {
        id: "scientists.geo",
        label: "Geo Scientist (zonas)",
        description:
          "Valida bairros/cidades de uma zona vs o briefing geográfico (encaixe, fora-do-critério, sugestões)."
      },
      {
        id: "scientists.testing",
        label: "Testing Scientist (simulação)",
        description:
          "Simulação interna (não A/B na Meta): consome os dossiês dos outros cientistas + nicho/região e prevê hipótese, o que testar primeiro, vencedor provável, métrica e critério de parada. Só IA, zero searchapi."
      },
      {
        id: "scientists.consumer",
        label: "Consumer Scientist",
        description: "Pesquisa o comportamento e as motivações do público-alvo."
      },
      {
        id: "scientists.trend",
        label: "Trend Scientist",
        description: "Detecta tendências e momentum de mercado."
      },
      {
        id: "scientists.hypothesis",
        label: "Hypothesis Scientist",
        description: "Gera hipóteses testáveis a partir dos achados."
      },
      {
        id: "scientists.confidence",
        label: "Confidence Scientist",
        description: "Valida estatisticamente a confiança dos achados."
      }
    ]
  },
  {
    id: "ai",
    label: "Inteligência Artificial",
    description: "Provedores e roteamento de IA (Gemini + Claude).",
    children: [
      {
        id: "ai.router",
        label: "Roteador Gemini + Claude",
        description:
          "Escolhe o melhor modelo por tarefa (economia × acertividade). Desligado: usa só Gemini."
      },
      { id: "ai.gemini", label: "Provedor Gemini", description: "Permite uso do Google Gemini." },
      { id: "ai.claude", label: "Provedor Claude", description: "Permite uso do Anthropic Claude." }
    ]
  },
  {
    id: "meta",
    label: "Meta — Conversões",
    description: "Integrações server-side com a Meta.",
    children: [
      {
        id: "meta.capi",
        label: "Conversions API (CAPI)",
        description: "Envio server-side de eventos de conversão para a Meta."
      },
      {
        id: "meta.attribution",
        label: "Janelas de atribuição",
        description: "Seleção de janela/modelo de atribuição nos relatórios/dashboard."
      }
    ]
  }
  // TODO: adicionar módulos Dashboard, Campanhas, Criativos, Relatórios… conforme forem
  // recebendo aplicação de flag no produto.
];

/** Todos os nós achatados (pré-ordem). */
export function flattenFeatureNodes(nodes: FeatureNode[] = FEATURE_REGISTRY): FeatureNode[] {
  const out: FeatureNode[] = [];
  const walk = (list: FeatureNode[]) => {
    for (const n of list) {
      out.push(n);
      if (n.children?.length) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

/** Conjunto de ids válidos do registry. */
export function featureIdSet(): Set<string> {
  return new Set(flattenFeatureNodes().map((n) => n.id));
}

/** Busca um nó pelo id. */
export function findFeatureNode(id: string): FeatureNode | undefined {
  return flattenFeatureNodes().find((n) => n.id === id);
}

/** Ancestrais derivados do id hierárquico (ex.: "brain.chat" → ["brain"]). */
export function featureAncestors(id: string): string[] {
  const parts = id.split(".");
  const out: string[] = [];
  for (let i = 1; i < parts.length; i += 1) {
    out.push(parts.slice(0, i).join("."));
  }
  return out;
}

/** Normaliza entrada legada (boolean) ou objeto para `FeatureFlagEntry | null`. */
export function normalizeFlagEntry(raw: unknown): FeatureFlagEntry | null {
  if (raw === false) return { mode: "off" };
  if (raw === true) return { mode: "global" };
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const mode = o.mode as FeatureRolloutMode | undefined;
  if (
    mode !== "off" &&
    mode !== "admin_only" &&
    mode !== "global" &&
    mode !== "specific_users"
  ) {
    return null;
  }
  const allowedUserIds = Array.isArray(o.allowedUserIds)
    ? o.allowedUserIds.filter((x): x is string => typeof x === "string")
    : undefined;
  return { mode, allowedUserIds };
}

/** Entrada explícita armazenada para um id (sem herança). */
export function getStoredEntry(
  flags: FeatureFlagConfigMap,
  id: string
): FeatureFlagEntry | null {
  return normalizeFlagEntry(flags[id]);
}

/**
 * Modo efetivo após herança ao longo do caminho root → id.
 * Default na raiz = `global`.
 */
export function getEffectiveRollout(
  flags: FeatureFlagConfigMap,
  id: string
): FeatureFlagEntry {
  const path = [...featureAncestors(id), id];
  let effective: FeatureFlagEntry = { mode: "global" };
  for (const nodeId of path) {
    const stored = getStoredEntry(flags, nodeId);
    if (stored) effective = { ...stored, allowedUserIds: stored.allowedUserIds?.slice() };
  }
  return effective;
}

/** Qualquer ancestral com modo `off` explícito desliga toda a subárvore. */
export function isAncestorHardOff(flags: FeatureFlagConfigMap, id: string): boolean {
  for (const anc of featureAncestors(id)) {
    const stored = getStoredEntry(flags, anc);
    if (stored?.mode === "off") return true;
  }
  return false;
}

function rolloutAllowsUser(entry: FeatureFlagEntry, ctx: FeatureFlagContext): boolean {
  switch (entry.mode) {
    case "off":
      return false;
    case "admin_only":
      return ctx.isPlatformAdmin;
    case "global":
      return true;
    case "specific_users":
      return !!ctx.userId && (entry.allowedUserIds?.includes(ctx.userId) ?? false);
    default:
      return true;
  }
}

/**
 * Resolve se uma feature está habilitada para um usuário, considerando:
 * - cascata `off` em ancestrais;
 * - herança de rollout ao longo do caminho;
 * - interdependência (`dependsOn`).
 */
export function isFeatureEnabledForUser(
  flags: FeatureFlagConfigMap,
  id: string,
  ctx: FeatureFlagContext,
  seen: Set<string> = new Set()
): boolean {
  if (seen.has(id)) return true;
  seen.add(id);

  if (isAncestorHardOff(flags, id)) return false;

  const effective = getEffectiveRollout(flags, id);
  if (!rolloutAllowsUser(effective, ctx)) return false;

  const node = findFeatureNode(id);
  if (node?.dependsOn) {
    for (const dep of node.dependsOn) {
      if (!isFeatureEnabledForUser(flags, dep, ctx, seen)) return false;
    }
  }
  return true;
}

/** Resolve todas as features do registry para um usuário (mapa booleano). */
export function resolveAllFeaturesForUser(
  flags: FeatureFlagConfigMap,
  ctx: FeatureFlagContext
): ResolvedFeatureMap {
  const out: ResolvedFeatureMap = {};
  for (const node of flattenFeatureNodes()) {
    out[node.id] = isFeatureEnabledForUser(flags, node.id, ctx);
  }
  return out;
}

/**
 * Compat: mapa já resolvido (booleans) ou config cru (admin).
 * Para mapas resolvidos (`platformFeatures` do `/api/me/entitlements`), basta `flags[id] !== false`.
 */
export function isFeatureEnabled(
  flags: FeatureFlagConfigMap | ResolvedFeatureMap,
  id: string,
  seen: Set<string> = new Set()
): boolean {
  const raw = flags[id];
  if (typeof raw === "boolean") return raw;
  if (seen.has(id)) return true;
  seen.add(id);

  for (const nodeId of featureAncestors(id)) {
    const anc = flags[nodeId];
    if (anc === false) return false;
    if (typeof anc === "boolean" && !anc) return false;
    const entry = normalizeFlagEntry(anc);
    if (entry?.mode === "off") return false;
  }

  const entry = normalizeFlagEntry(raw);
  if (entry?.mode === "off") return false;

  const node = findFeatureNode(id);
  if (node?.dependsOn) {
    for (const dep of node.dependsOn) {
      if (!isFeatureEnabled(flags, dep, seen)) return false;
    }
  }
  return true;
}
