import type { FeatureFlagMap, FeatureNode } from "./types";

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
    id: "campaigns",
    label: "Campanhas",
    description: "Criador e gestão de campanhas Meta.",
    children: [
      {
        id: "campaigns.meta-app-development-notice",
        label: "Aviso app Meta em desenvolvimento",
        description:
          "Texto no passo Anúncio lembrando importar criativo quando o app não está aprovado para publicar."
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

/**
 * Resolve se uma feature está habilitada (efetivo), considerando:
 * - default ON (só `false` explícito desliga);
 * - cascata: o próprio nó e TODOS os ancestrais precisam estar ON;
 * - interdependência: todos os `dependsOn` precisam estar habilitados.
 * Função pura (sem I/O) — pode rodar no client e no server.
 */
export function isFeatureEnabled(
  flags: FeatureFlagMap,
  id: string,
  seen: Set<string> = new Set()
): boolean {
  if (seen.has(id)) return true; // proteção contra ciclo em dependsOn
  seen.add(id);

  for (const nodeId of [...featureAncestors(id), id]) {
    if (flags[nodeId] === false) return false;
  }

  const node = findFeatureNode(id);
  if (node?.dependsOn) {
    for (const dep of node.dependsOn) {
      if (!isFeatureEnabled(flags, dep, seen)) return false;
    }
  }
  return true;
}
