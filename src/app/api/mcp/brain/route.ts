import { NextResponse } from "next/server";

import { isPlatformFeatureEnabled } from "@/lib/feature-flags/service";
import { verifyMcpToken } from "@/lib/mcp/auth";
import { handleMcpRequest } from "@/lib/mcp/brain-server";

/**
 * Endpoint MCP (JSON-RPC 2.0 sobre HTTP) do Agency Brain — read-only.
 * Auth: `Authorization: Bearer <token MCP>` (escopo tenant). Gate: flag `brain.mcp`.
 */
export async function POST(req: Request) {
  if (!(await isPlatformFeatureEnabled("brain.mcp"))) {
    return NextResponse.json({ error: "mcp_disabled" }, { status: 404 });
  }

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : null;
  const tenantId = await verifyMcpToken(token);
  if (!tenantId) {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32001, message: "Unauthorized" } },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
      { status: 400 }
    );
  }

  // Batch JSON-RPC.
  if (Array.isArray(body)) {
    const results = (await Promise.all(body.map((r) => handleMcpRequest(tenantId, r)))).filter(
      Boolean
    );
    return NextResponse.json(results);
  }

  const res = await handleMcpRequest(tenantId, body as Record<string, unknown>);
  if (!res) return new NextResponse(null, { status: 202 }); // notificação
  return NextResponse.json(res);
}
