import { NextResponse } from "next/server";
import { z } from "zod";
import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";
import { normalizeGoogleTableColumns, type GoogleTableKind } from "@/lib/google-table-columns";

const Kind = z.enum(["campaigns", "adGroups", "ads"]);

export async function GET(req: Request) {
  const kind = Kind.parse(new URL(req.url).searchParams.get("table"));
  const { tenant, user } = await getAppContext();
  const { tenantMember: repo } = await repositories();
  const member = await repo.findOne({ where: { tenantId: tenant.id, userId: user.id } });
  return NextResponse.json({ ok: true, columns: normalizeGoogleTableColumns(kind, member?.googleTableColumns?.[kind]) });
}

export async function PATCH(req: Request) {
  const body = z.object({ table: Kind, columns: z.array(z.string()).min(1).max(12) }).parse(await req.json());
  const { tenant, user } = await getAppContext();
  const { tenantMember: repo } = await repositories();
  let member = await repo.findOne({ where: { tenantId: tenant.id, userId: user.id } });
  if (!member) member = repo.create({ tenantId: tenant.id, userId: user.id, role: "member" });
  const columns = normalizeGoogleTableColumns(body.table as GoogleTableKind, body.columns);
  member.googleTableColumns = { ...(member.googleTableColumns ?? {}), [body.table]: columns };
  await repo.save(member);
  return NextResponse.json({ ok: true, columns });
}
