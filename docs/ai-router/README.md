# Roteador de IA (Gemini + Claude)

> Camada única que decide **qual modelo de IA usar em cada situação**, equilibrando
> **economia** (Gemini Flash/Flash-Lite) e **acertividade** (Claude Sonnet/Opus). Ligável/desligável
> por **feature flag**. Fonte de verdade desta feature — atualize a cada incremento.

## TL;DR

- Antes: todo uso de IA chamava **Gemini** direto (`geminiGenerateJson`).
- Agora: existe um **ponto único** — `aiGenerateJson({ task, prompt, schema })` — que **escolhe
  provedor + modelo pela natureza da tarefa**, com **fallback cross-provider** se um falhar.
- **Tudo via feature flag** (admin liga/desliga separadamente): `ai.router`, `ai.gemini`, `ai.claude`.

## Arquitetura

| Peça | Arquivo | Papel |
|---|---|---|
| Tipos | [`src/lib/ai/types.ts`](../../src/lib/ai/types.ts) | `AiTask`, `AiTaskKind`, `AiModelChoice`, `AiGenerateMeta`. |
| Cliente Claude | [`src/lib/ai/claude.ts`](../../src/lib/ai/claude.ts) | `fetch` cru p/ Anthropic Messages API (espelha `gemini.ts`, sem SDK). Modelos + preços. |
| Roteador (puro) | [`src/lib/ai/router.ts`](../../src/lib/ai/router.ts) | `chooseAiModel(task, disponibilidade)` → provedor/modelo + **razão**. |
| Entrada única | [`src/lib/ai/generate.ts`](../../src/lib/ai/generate.ts) | `aiGenerateJson` — resolve flags+chaves, roteia, valida (Zod) e faz **fallback**. |
| Gemini (existente) | [`src/lib/gemini.ts`](../../src/lib/gemini.ts) | Reusado para o caminho Gemini (+ `extractJson` exportado). |

> **Por que `fetch` cru e não o SDK `@anthropic-ai/sdk`?** Para **bater com o código existente**
> (`gemini.ts` já chama o provedor via `fetch`, sem dependência) e não introduzir um pacote novo.
> A skill `claude-api` foi consultada para endpoint/headers/IDs corretos.

## Como o roteador decide

Entrada: a `task` (natureza + complexidade + flags) e a **disponibilidade efetiva** (flag ligada **e**
chave presente). Regras (em `chooseAiModel`):

| Situação | Vai para | Modelo | Porquê |
|---|---|---|---|
| `ai.router` **desligado** | Gemini | Flash-Lite/Flash | Comportamento **legado** preservado |
| Acertividade (`agent_proposal`, `reasoning`, `analysis`, ou `complexity: high`, ou `accuracyCritical`) | **Claude** | `accuracyCritical`/`high` → **Opus 4.8**; senão **Sonnet 4.6** | Tarefa que precisa acertar |
| Barata/alto volume (`classification`, `extraction`) | **Gemini** | **Flash-Lite** | Mais barato e rápido |
| Balanceado (chat/summary/criativo, complexidade média) | **Gemini** | **Flash** | Economia no caso comum |

Se o provedor escolhido falhar (429/503/refusal/sem resposta), `aiGenerateJson` faz **fallback
cross-provider** para o outro provedor habilitado (Claude→Gemini Flash, Gemini→Claude Haiku) e
registra `fellBackFrom` no `meta`.

**Preços de referência** (USD/1M tok, no `claude.ts`): Opus 4.8 5/25 · Sonnet 4.6 3/15 · Haiku 4.5
1/5. Gemini Flash-Lite/Flash são ordens de magnitude mais baratos → por isso o "padrão" econômico é
Gemini e o Claude entra onde a acertividade paga a conta.

## Uso

```ts
import { aiGenerateJson } from "@/lib/ai/generate";

const { data, meta } = await aiGenerateJson({
  task: { kind: "agent_proposal", complexity: "medium", label: "brain.chat" },
  prompt,
  schema: MySchema,          // Zod — saída validada
  geminiApiKey: process.env.GEMINI_API_KEY // opcional; default lê do env
});
// meta = { provider, model, reason, fellBackFrom }  → telemetria + explicabilidade
```

**Já integrado em:** o agente do Brain ([`chat-agent-service.ts`](../../src/lib/agency-brain/chat-agent-service.ts))
usa `kind: "agent_proposal"` → tende a Claude quando habilitado, cai p/ Gemini se Claude off/sem chave.

> **Não tocado de propósito:** lógica de **públicos, ranking e criação de campanha/anúncio/criativo**
> (restrição do produto — "já está redondinho"). O criador de campanhas tem seu próprio uso de IA.

## Feature flags (admin)

Em **Configurações → Feature Flags → Módulos & Funcionalidades** (ver [feature-flags](../feature-flags.md)):

- `ai.router` — liga o roteamento inteligente. **OFF = só Gemini** (legado).
- `ai.gemini` — habilita o provedor Gemini.
- `ai.claude` — habilita o provedor Claude.

Desligar um provedor faz o roteador usar só o outro; desligar os dois bloqueia (erro claro).
Cada flag é **independente** (default ON). Chaves: `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`.

## Verificação

1. Sem `ANTHROPIC_API_KEY` → tudo continua no Gemini (sem quebrar).
2. Com `ANTHROPIC_API_KEY` + `ai.router` ON → o chat do Brain roteia propostas para Claude;
   `meta.provider` = `claude`.
3. Desligar `ai.claude` no admin → volta para Gemini em ~60s (cache de flags).

## Pendências / próximos (mesma frente do plano do Brain)

Ver [cerebro-da-agencia/plano-acao-vs-redtrack](../cerebro-da-agencia/plano-acao-vs-redtrack.md):
- **MCP server (P1.3)** — flag `brain.mcp` já criada; servidor a implementar.
- **Meta CAPI (P0)** — flag `meta.capi` criada; cliente/UI a implementar.
- **Janelas de atribuição (P2)** — flag `meta.attribution` criada; a implementar.
- Migrar outros usos de `geminiGenerateJson` para `aiGenerateJson` conforme a tarefa se beneficiar.

## Histórico
- 2026-06-27: Roteador criado (Gemini+Claude, decisão por tarefa, fallback cross-provider),
  flags `ai.*` + `brain.mcp(.write)` + `meta.*`, e o agente do Brain ligado ao roteador.
