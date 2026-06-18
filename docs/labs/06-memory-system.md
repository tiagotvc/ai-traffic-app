# Sistema de memória

Labs acumula conhecimento reutilizável em camadas. Persistência inicial em Supabase (`labs_*`); merge seletivo para Agency Brain.

## Tipos de memória

| Memória | Escopo | Tabela | Fase |
|---------|--------|--------|------|
| **Market Memory** | Nicho/produto/mercado | `labs_market_memories` | 3 |
| **Client Memory / DNA** | Cliente específico | `labs_client_memories` | 3 |
| **Global Memory** | Agregado anonimizado | `labs_global_patterns` | 3 |
| **Episodic** | Histórias de experimentos | embeddings em `labs_market_memories` | 3 |
| **Semantic** | Conceitos e relações | `labs_knowledge_nodes/edges` | 3 |

## Market Memory

Exemplo (Minoxidil / skincare):

- Dores, desejos, hooks recorrentes
- Ofertas dominantes, saturação de ângulos
- Tendências históricas
- Oportunidades detectadas em scans noturnos

Atualizada por: `market.memory.merge`, experimentos concluídos, nightly jobs.

## Client Memory

Integra com **Client DNA** existente (`client_dna`):

- Criativos vencedores / perdedores
- Hooks que funcionaram na conta
- Públicos, ofertas, aprendizados Labs anteriores

Fonte: Winner/Failure Scientists, dados Meta do cliente, merge pós-experimento.

## Global Memory

Padrões anonimizados entre workspaces:

- "Em skincare, UGC costuma performar"
- "Em games, gameplay direto no hook"
- Sem PII, sem identificar clientes

## Episodic vs Semantic

**Episodic:** narrativa de um experimento

> Creator Ads falhou em público 45+; autoridade médica funcionou melhor.

**Semantic:** grafo de conceitos

```txt
Calvície → vergonha → autoestima → confiança → transformação → UGC
```

Knowledge Graph Scientist (fase 3) popula nós e arestas.

## Memory Compression Scientist

Comprime N experimentos em princípios (fase 3):

1. UGC funciona bem em skincare
2. Autoridade aumenta confiança
3. Frete grátis vence desconto baixo

## Jobs relacionados

- `market.memory.merge` — nightly
- `agency.brain.merge` — push para Postgres Agency Brain
- `dream.cycle` — conexões cross-market (fase 4)

## Leitura antes de pesquisar

GraphRAG Engine (fase 4): consultar memória existente antes de nova coleta externa — reduz custo e duplicação.
