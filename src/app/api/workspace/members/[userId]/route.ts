import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { repositories } from "@/db/repositories";
import { isWorkspaceAdmin } from "@/lib/workspace-members";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const { tenant, user } = await getAppContext();

  if (!(await isWorkspaceAdmin(tenant.id, user.id))) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  if (userId === user.id) {
    return NextResponse.json({ ok: false, error: "cannot_remove_self" }, { status: 400 });
  }

  const { tenantMember: memberRepo } = await repositories();
  await memberRepo.delete({ tenantId: tenant.id, userId });

  return NextResponse.json({ ok: true });
}
