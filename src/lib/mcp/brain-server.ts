import "server-only";

import { repositories } from "@/db/repositories";
import { createActionSuggestion } from "@/lib/action-suggestions/action-suggestion-service";
import type { ActionSuggestionType } from "@/lib/action-suggestions/types";
import { listApprovedLearnings } from "@/lib/agency-brain/client-learning-service";
import { getClientBrainContext } from "@/lib/agency-brain/get-client-brain-context";

const ACTION_TYPES: ActionSuggestionType[] = [
  "scale_budget",
  "pause_campaign",
  "duplicate_audience",
  "refresh_creative",
  "review_campaign"
];

/**
 * Servidor MCP (Model Context Protocol) **read-only** sobre o Agency Brain.
 * Implementa JSON-RPC 2.0 sobre HTTP. Espelha o `getClientBrainContext`,
 * sempre com escopo no `tenantId` autenticado (token MCP). P1.4 (escrita) fica
 * atrás da flag `brain.mcp.write` e ainda não está implementado.
 */

const PROTOCOL_VERSION = "2025-06-18";
const SERVER_INFO = { name: "orion-agency-brain", version: "1.0.0" };

type JsonRpcId = string | number | null;
type JsonRpcReq = { jsonrpc?: string; id?: JsonRpcId; method?: string; params?: Record<string, unknown> };
type JsonRpcRes = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result?: unknown;
  error?: { code: number; message: string };
};

function ok(id: JsonRpcId, result: unknown): JsonRpcRes {
  return { jsonrpc: "2.0", id: id ?? null, result };
}
function rpcError(id: JsonRpcId, code: number, message: string): JsonRpcRes {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

const TOOLS = [
  {
    name: "list_clients",
    description: "Lista os clientes do workspace (id + nome).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    name: "get_client_brain",
    description:
      "Resumo do Agency Brain de um cliente: aprendizados de maior impacto, DNA, tags e top criativos.",
    inputSchema: {
      type: "object",
      properties: { clientId: { type: "string", description: "ID do cliente" } },
      required: ["clientId"],
      additionalProperties: false
    }
  },
  {
    name: "list_learnings",
    description: "Aprendizados aprovados de um cliente (título, categoria, impacto, descrição).",
    inputSchema: {
      type: "object",
      properties: {
        clientId: { type: "string", description: "ID do cliente" },
        limit: { type: "number", description: "Máx. de aprendizados (default 50, teto 100)" }
      },
      required: ["clientId"],
      additionalProperties: false
    }
  }
] as const;

/** Ferramentas de **escrita** — só expostas/executáveis com a flag `brain.mcp.write`. */
const WRITE_TOOLS = [
  {
    name: "propose_action",
    description:
      "Cria uma PROPOSTA de ação (pendente de aprovação humana na UI). Nunca executa direto.",
    inputSchema: {
      type: "object",
      properties: {
        clientId: { type: "string" },
        actionType: {
          type: "string",
          enum: ACTION_TYPES,
          description: "scale_budget | pause_campaign | duplicate_audience | refresh_creative | review_campaign"
        },
        title: { type: "string" },
        description: { type: "string" },
        metaCampaignId: { type: "string" },
        budgetIncreasePercent: { type: "number" }
      },
      required: ["clientId", "actionType"],
      additionalProperties: false
    }
  }
] as const;

const WRITE_TOOL_NAMES = new Set<string>(WRITE_TOOLS.map((t) => t.name));

async function listClients(tenantId: string) {
  const { client: repo } = await repositories();
  const rows = await repo.find({ where: { tenantId }, order: { name: "ASC" } });
  return rows.map((c) => ({ id: c.id, name: c.name }));
}

async function clientBrainSummary(tenantId: string, clientId: string) {
  const ctx = await getClientBrainContext(tenantId, clientId);
  return {
    clientId,
    summary: ctx.summaryText,
    tags: ctx.tags,
    topLearnings: ctx.topLearnings.map((l) => ({
      title: l.title,
      category: l.category,
      impact: l.impact
    })),
    dna: ctx.dna?.summaryText ?? null,
    topCreatives: (ctx.topCreatives ?? []).slice(0, 5).map((c) => ({ name: c.name, tier: c.tier }))
  };
}

async function clientLearnings(tenantId: string, clientId: string, limit?: number) {
  const rows = await listApprovedLearnings(tenantId, clientId, Math.min(limit ?? 50, 100));
  return rows.map((l) => ({
    id: l.id,
    title: l.title,
    category: l.category,
    impact: l.impact,
    description: l.description,
    tags: l.tags ?? []
  }));
}

function textResult(data: unknown) {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}
function toolError(message: string) {
  return { content: [{ type: "text", text: message }], isError: true };
}

async function proposeAction(tenantId: string, args: Record<string, unknown>) {
  const clientId = String(args?.clientId ?? "");
  const actionType = String(args?.actionType ?? "") as ActionSuggestionType;
  if (!clientId) return toolError("clientId é obrigatório");
  if (!ACTION_TYPES.includes(actionType)) {
    return toolError(`actionType inválido (use: ${ACTION_TYPES.join(", ")})`);
  }
  const metaCampaignId = args?.metaCampaignId ? String(args.metaCampaignId) : null;
  const budgetIncreasePercent =
    typeof args?.budgetIncreasePercent === "number" ? args.budgetIncreasePercent : undefined;

  const created = await createActionSuggestion(tenantId, clientId, {
    title: String(args?.title ?? "").slice(0, 200) || `Proposta via MCP: ${actionType}`,
    description:
      String(args?.description ?? "").slice(0, 2000) ||
      "Proposta criada via MCP (aguardando aprovação humana).",
    actionType,
    actionPayload: {
      ...(metaCampaignId ? { metaCampaignId } : {}),
      ...(budgetIncreasePercent ? { budgetIncreasePercent } : {})
    },
    source: "AI",
    metaCampaignId,
    evidence: { reason: "Proposta criada via MCP (escrita)" },
    dedupeKey: `mcp-${clientId}-${actionType}-${metaCampaignId ?? "x"}-${Date.now()}`
  });

  if (!created) return textResult({ created: false, reason: "duplicada" });
  return textResult({
    created: true,
    id: created.id,
    status: created.status,
    note: "PENDENTE — requer aprovação humana na UI (Centro de ações)."
  });
}

async function callTool(
  tenantId: string,
  name: string,
  args: Record<string, unknown>,
  writeEnabled: boolean
) {
  if (WRITE_TOOL_NAMES.has(name) && !writeEnabled) {
    return toolError("Escrita via MCP desabilitada (flag brain.mcp.write).");
  }
  switch (name) {
    case "list_clients":
      return textResult(await listClients(tenantId));
    case "get_client_brain": {
      const clientId = String(args?.clientId ?? "");
      if (!clientId) return toolError("clientId é obrigatório");
      return textResult(await clientBrainSummary(tenantId, clientId));
    }
    case "list_learnings": {
      const clientId = String(args?.clientId ?? "");
      if (!clientId) return toolError("clientId é obrigatório");
      const limit = typeof args?.limit === "number" ? args.limit : undefined;
      return textResult(await clientLearnings(tenantId, clientId, limit));
    }
    case "propose_action":
      return proposeAction(tenantId, args);
    default:
      return toolError(`Ferramenta desconhecida: ${name}`);
  }
}

/** Despacha um request JSON-RPC. Retorna `null` para notificações (sem resposta). */
export async function handleMcpRequest(
  tenantId: string,
  req: JsonRpcReq,
  opts: { writeEnabled?: boolean } = {}
): Promise<JsonRpcRes | null> {
  const writeEnabled = Boolean(opts.writeEnabled);
  const id = req?.id ?? null;
  const method = req?.method;
  const params = (req?.params ?? {}) as Record<string, unknown>;

  if (typeof method !== "string") return rpcError(id, -32600, "Invalid request");
  if (method.startsWith("notifications/")) return null;

  try {
    switch (method) {
      case "initialize":
        return ok(id, {
          protocolVersion:
            typeof params.protocolVersion === "string" ? params.protocolVersion : PROTOCOL_VERSION,
          capabilities: { tools: {}, resources: {} },
          serverInfo: SERVER_INFO
        });
      case "ping":
        return ok(id, {});
      case "tools/list":
        return ok(id, { tools: writeEnabled ? [...TOOLS, ...WRITE_TOOLS] : TOOLS });
      case "tools/call": {
        const name = String(params.name ?? "");
        const args = (params.arguments ?? {}) as Record<string, unknown>;
        return ok(id, await callTool(tenantId, name, args, writeEnabled));
      }
      case "resources/list": {
        const clients = await listClients(tenantId);
        return ok(id, {
          resources: clients.map((c) => ({
            uri: `brain://client/${c.id}`,
            name: `Brain: ${c.name}`,
            mimeType: "application/json"
          }))
        });
      }
      case "resources/read": {
        const uri = String(params.uri ?? "");
        const match = uri.match(/^brain:\/\/client\/(.+)$/);
        if (!match) return rpcError(id, -32602, "URI inválida (use brain://client/{id})");
        const data = await clientBrainSummary(tenantId, match[1]!);
        return ok(id, {
          contents: [{ uri, mimeType: "application/json", text: JSON.stringify(data, null, 2) }]
        });
      }
      case "prompts/list":
        return ok(id, { prompts: [] });
      default:
        return rpcError(id, -32601, `Método não suportado: ${method}`);
    }
  } catch (e) {
    return rpcError(id, -32603, e instanceof Error ? e.message : "Erro interno");
  }
}
