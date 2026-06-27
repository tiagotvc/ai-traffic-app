import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { assertFeatureEnabled, FeatureDisabledError } from "@/lib/feature-flags/service";
import { createMcpToken, listMcpTokens, revokeMcpToken } from "@/lib/mcp/auth";
import { isWorkspaceAdmin } from "@/lib/workspace-members";

/** Gestão de tokens MCP (escopo tenant). Só admin do workspace; gate `brain.mcp`. */
async function guard(): Promise<string> {
  await assertFeatureEnabled("brain.mcp");
  const { tenant, user } = await getAppContext();
  if (!(await isWorkspaceAdmin(tenant.id, user.id))) throw new Error("forbidden");
  return tenant.id;
}

function errorResponse(e: unknown) {
  if (e instanceof FeatureDisabledError) {
    return NextResponse.json({ ok: false, error: "mcp_disabled" }, { status: 404 });
  }
  const msg = e instanceof Error ? e.message : "error";
  return NextResponse.json({ ok: false, error: msg }, { status: msg === "forbidden" ? 403 : 500 });
}

export async function GET() {
  try {
    const tenantId = await guard();
    return NextResponse.json({ ok: true, tokens: await listMcpTokens(tenantId) });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const tenantId = await guard();
    const body = (await req.json().catch(() => ({}))) as { label?: unknown };
    const label = typeof body?.label === "string" ? body.label : undefined;
    // `token` aparece só aqui (uma vez) — o cliente deve guardá-lo.
    return NextResponse.json({ ok: true, ...(await createMcpToken(tenantId, label)) });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(req: Request) {
  try {
    const tenantId = await guard();
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    await revokeMcpToken(tenantId, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
