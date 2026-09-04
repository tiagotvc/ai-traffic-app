import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";
import { normalizeGoogleKeywordColumns } from "@/lib/google-keyword-columns";

export async function GET() {
  const { tenant, user } = await getAppContext();
  const { tenantMember: repo } = await repositories();
  const member = await repo.findOne({ where: { tenantId: tenant.id, userId: user.id } });
  return NextResponse.json({ ok: true, columns: normalizeGoogleKeywordColumns(member?.googleKeywordColumns) });
}

export async function PATCH(req: Request) {
  const { tenant, user } = await getAppContext();
  const body = z.object({ columns: z.array(z.string()).min(1).max(20) }).parse(await req.json());
  const columns = normalizeGoogleKeywordColumns(body.columns);
  const { tenantMember: repo } = await repositories();
  let member = await repo.findOne({ where: { tenantId: tenant.id, userId: user.id } });
  if (!member) member = repo.create({ tenantId: tenant.id, userId: user.id, role: "member" });
  member.googleKeywordColumns = columns;
  await repo.save(member);
  return NextResponse.json({ ok: true, columns });
}
