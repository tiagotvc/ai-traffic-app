# Servidor MCP do Agency Brain (read-only)

> Expõe o **Agency Brain** via **MCP (Model Context Protocol)** para ferramentas de IA externas
> (Claude Desktop, IDEs, agentes). JSON-RPC 2.0 sobre HTTP, **escopo por tenant**, atrás da flag
> `brain.mcp`. Implementa o **P1.3** do [plano vs. RedTrack](../cerebro-da-agencia/plano-acao-vs-redtrack.md).
> Fonte de verdade desta feature.

## TL;DR

- Endpoint: **`POST /api/mcp/brain`** (JSON-RPC 2.0).
- Auth: **`Authorization: Bearer <token MCP>`** — token por workspace, criado em `/api/mcp/tokens`.
- **Read-only**: lê learnings/DNA/criativos do Brain. Escrita (P1.4) fica atrás de `brain.mcp.write`
  (ainda não implementada).
- Liga/desliga pela flag **`brain.mcp`** (admin). Tudo isolado das outras features.

## Arquitetura

| Peça | Arquivo | Papel |
|---|---|---|
| Entidade token | [`src/db/entities/McpToken.ts`](../../src/db/entities/McpToken.ts) | Token por tenant (só o **SHA-256** é persistido). Migração `0052`. |
| Auth | [`src/lib/mcp/auth.ts`](../../src/lib/mcp/auth.ts) | `createMcpToken` / `verifyMcpToken` / `listMcpTokens` / `revokeMcpToken`. |
| Servidor MCP | [`src/lib/mcp/brain-server.ts`](../../src/lib/mcp/brain-server.ts) | Dispatch JSON-RPC: `initialize`, `tools/*`, `resources/*`, `ping`. |
| Endpoint MCP | [`src/app/api/mcp/brain/route.ts`](../../src/app/api/mcp/brain/route.ts) | POST: gate `brain.mcp` + Bearer → tenant → dispatch. |
| Gestão de tokens | [`src/app/api/mcp/tokens/route.ts`](../../src/app/api/mcp/tokens/route.ts) | GET/POST/DELETE (só admin do workspace). |

## Capacidades expostas

**Tools** (`tools/list` / `tools/call`):
- `list_clients` — clientes do workspace (`id`, `name`).
- `get_client_brain` `{clientId}` — resumo: `summary`, `tags`, `topLearnings`, `dna`, `topCreatives`.
- `list_learnings` `{clientId, limit?}` — aprendizados aprovados (título/categoria/impacto/descrição).

**Resources** (`resources/list` / `resources/read`):
- Um recurso por cliente: `brain://client/{id}` → o mesmo resumo do `get_client_brain`.

Tudo **espelha** o `getClientBrainContext` e é **sempre filtrado pelo `tenantId` do token** — um
token nunca enxerga dados de outro workspace.

## Como usar

1. **Criar token** (admin): `POST /api/mcp/tokens` `{ "label": "Claude Desktop" }` →
   resposta traz `token` (prefixo `orion_mcp_…`) **uma única vez**. Guardar.
2. **Conectar** a ferramenta MCP ao endpoint com o header Bearer. Exemplo de chamada crua:

```bash
curl -s https://SEU_HOST/api/mcp/brain \
  -H "Authorization: Bearer orion_mcp_xxx" \
  -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call",
       "params":{"name":"get_client_brain","arguments":{"clientId":"<id>"}}}'
```

3. **Revogar**: `DELETE /api/mcp/tokens?id=<tokenId>`.

## Segurança

- Token **hasheado** (SHA-256) no banco; o segredo só aparece na criação.
- Gestão de tokens exige **admin do workspace** (`isWorkspaceAdmin`) + flag `brain.mcp`.
- Endpoint MCP **404** quando a flag está off; **401** sem token válido.
- **Read-only** por design — nenhuma ação muta dados. Escrita exige `brain.mcp.write` (futuro) e
  reusará a confirmação humana do fluxo de ações.

## Monetização (roadmap)

Conforme o plano (espelhando a RedTrack que cobra MCP como tier): dá para gatear o MCP por
plano/add-on no billing (ex.: limite de tokens/requisições). Hoje o gate é só a flag de plataforma.

## Verificação

1. Flag `brain.mcp` ON + token válido → `tools/list` retorna as 3 tools; `get_client_brain` devolve
   o resumo do cliente.
2. Sem token → 401. Flag OFF → 404.
3. Token de outro tenant nunca vê clientes que não são dele.

## UI
Criar/revogar tokens fica em **Configurações → Integrações → Ferramentas avançadas**
([`AdvancedToolsPanel`](../../src/components/settings/AdvancedToolsPanel.tsx)). O token aparece
**uma vez** com botão de copiar.

## Pendências
- (P1.4 escrita via MCP — ✅ feito: `propose_action` cria proposta pendente.)

## Histórico
- 2026-06-27: Servidor MCP read-only criado (tools + resources espelhando o Brain), tokens por
  tenant (entidade + migração `0052`), endpoint e gestão de tokens, atrás da flag `brain.mcp`.
