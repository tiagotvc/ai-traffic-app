import { NextResponse } from "next/server";
import { In } from "typeorm";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext, slugify } from "@/lib/app-context";
import { invalidateClientsListCache } from "@/lib/clients-list";

const BodySchema = z.object({
  clientIds: z.array(z.string().uuid()).min(1).max(50)
});

function isProtectedClient(name: string) {
  return name === "Default" || slugify(name) === "default";
}

export async function POST(req: Request) {
  try {
    const { tenant } = await getAppContext();
    const body = BodySchema.parse(await req.json().catch(() => ({})));
    const { client: clientRepo } = await repositories();

    const clients = await clientRepo.find({
      where: { tenantId: tenant.id, id: In(body.clientIds) }
    });
    const byId = new Map(clients.map((c) => [c.id, c]));

    const deleted: string[] = [];
    const skipped: Array<{ id: string; name: string; reason: "default" }> = [];
    const notFound: string[] = [];

    for (const id of body.clientIds) {
      const client = byId.get(id);
      if (!client) {
        notFound.push(id);
        continue;
      }
      if (isProtectedClient(client.name)) {
        skipped.push({ id: client.id, name: client.name, reason: "default" });
        continue;
      }
      await clientRepo.remove(client);
      deleted.push(client.id);
    }

    if (deleted.length) {
      await invalidateClientsListCache(tenant.id);
    }

    return NextResponse.json({
      ok: true,
      deletedCount: deleted.length,
      skipped,
      notFoundCount: notFound.length
    });
  } catch (e) {
    console.error("[POST /api/clients/bulk-delete]", e);
    const message = e instanceof Error ? e.message : "Erro interno";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
