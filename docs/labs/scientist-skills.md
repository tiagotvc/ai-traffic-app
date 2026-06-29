# Skills de Cientista (contrato + Marketing Scientist)

> Cada **cientista** (Labs) é modelado como uma **skill auto-contida**, executada **server-side pelo
> app** (não é uma skill do agente de código). Pluggável, flaggável e testável. Fonte de verdade.

## Contrato

[`src/lib/labs/skills/types.ts`](../../src/lib/labs/skills/types.ts):

```ts
type ScientistSkill = {
  id: string;
  flagId: string;                              // flag de plataforma (scientists.<id>)
  canRun(input): boolean;                      // pré-condições
  run(input): Promise<ScientistSkillResult>;   // pesquisa → findings
};
```

- **Registro/fábrica**: [`src/lib/labs/skills/index.ts`](../../src/lib/labs/skills/index.ts) →
  `runScientistSkill(id, input)` respeita a flag (`isPlatformFeatureEnabled`), valida `canRun`, e
  isola erros. Adicionar novos cientistas = registrar aqui.
- **Flags por cientista**: `scientists.competitor` / `consumer` / `trend` / `hypothesis` / `confidence`
  (registry de feature flags). Liga/desliga cada um no admin.

## Marketing Scientist (`competitor`)

[`src/lib/labs/skills/competitor-skill.ts`](../../src/lib/labs/skills/competitor-skill.ts) — pesquisa
concorrentes na **Meta Ad Library** e extrai padrões (hooks, ofertas, criativos).

- **Fonte de dados = integração do PRÓPRIO app** ([`meta-ad-library/provider.ts`](../../src/lib/meta-ad-library/provider.ts)):
  SearchAPI (`SEARCHAPI_API_KEY`, recomendado) → fallback Meta Graph (`META_AD_LIBRARY_ACCESS_TOKEN`).
  Reusa `fetchMetaAdLibrary` + `extractMarketPatterns` + `resolveSearchTerms`.
- **⚠️ Importante:** o **MCP Ad Library conectado no seu Claude (claude.ai) NÃO é acessível pelo
  servidor do app.** Para o Marketing Scientist consultar a Meta de verdade, defina **`SEARCHAPI_API_KEY`**
  (ou `META_AD_LIBRARY_ACCESS_TOKEN`) no `.env` do app. Sem isso, a skill retorna `ran:false`
  (`ad_library_not_configured`) e o card simplesmente não mostra a seção de concorrentes.

## Uso atual (persona)

[`/api/personas/insights`](../../src/app/api/personas/insights/route.ts) roda o `competitor` com o
`niche` derivado do briefing e devolve `competitor: { adsAnalyzed, findings[] }`. O card **Orion Brain**
([`PersonaCreatorBrainTips`](../../src/components/audiences/create/PersonaCreatorBrainTips.tsx)) mostra
"Concorrentes · N anúncios" + top padrões, abaixo do resumo da análise.

## Próximos cientistas (mesma fábrica)
`consumer`, `trend`, `hypothesis`, `confidence` — implementar cada um como uma skill nova em
`src/lib/labs/skills/` e registrar no index. Fontes/credits conforme `docs/labs/agents/*`.

## Histórico
- 2026-06-28: contrato de skill + Marketing Scientist (`competitor`) usando a Ad Library do app;
  flags por cientista; plugado na pesquisa da persona (card Orion Brain).
