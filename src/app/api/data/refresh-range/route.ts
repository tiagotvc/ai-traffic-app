import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { ensureFreshDataRange } from "@/lib/data-range-refresh";

export const maxDuration = 120;
const Schema = z.object({
  clientId: z.string().optional(),
  platforms: z.array(z.enum(["meta", "google"])).min(1),
  since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  force: z.boolean().optional()
}).refine((value) => value.since <= value.until, "intervalo inválido");

export async function POST(req: Request) {
  const body = Schema.parse(await req.json());
  const { tenant, metaAccessToken } = await getAppContext();
  const client = body.clientId ? await getClientBySlugOrId(tenant.id, body.clientId) : null;
  if (body.clientId && !client) return NextResponse.json({ ok: false, error: "client_not_found" }, { status: 404 });
  const results = await ensureFreshDataRange({
    tenantId: tenant.id,
    clientId: client?.id,
    platforms: body.platforms,
    since: body.since,
    until: body.until,
    metaAccessToken,
    force: body.force
  });
  return NextResponse.json({ ok: results.every((result) => result.ok), results });
}
