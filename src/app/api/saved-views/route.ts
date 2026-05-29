import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";

const BodySchema = z.object({
  name: z.string().min(1),
  filters: z.record(z.string(), z.unknown())
});

export async function GET() {
  const { tenant, user } = await getAppContext();
  const { savedView: repo } = await repositories();
  const views = await repo.find({
    where: { tenantId: tenant.id },
    order: { createdAt: "DESC" }
  });
  return NextResponse.json({
    ok: true,
    views: views.filter((v) => !v.userId || v.userId === user.id)
  });
}

export async function POST(req: Request) {
  const { tenant, user } = await getAppContext();
  const body = BodySchema.parse(await req.json().catch(() => ({})));
  const { savedView: repo } = await repositories();

  const view = await repo.save(
    repo.create({
      tenantId: tenant.id,
      userId: user.id,
      name: body.name,
      filters: body.filters
    })
  );

  return NextResponse.json({ ok: true, view });
}
