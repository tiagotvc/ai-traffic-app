import { NextResponse } from "next/server";

import { getDataSource } from "@/db/data-source";
import { repositories } from "@/db/repositories";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ds = await getDataSource();
    const entityNames = ds.entityMetadatas.map((m) => ({
      name: m.name,
      table: m.tableName,
      targetType: typeof m.target,
      targetName: typeof m.target === "function" ? m.target.name : String(m.target)
    }));

    const repos = await repositories();
    const tenantName = "Tenant health-check.local";
    let tenant = await repos.tenant.findOne({ where: { name: tenantName } });
    if (!tenant) {
      tenant = repos.tenant.create({ name: tenantName, brandName: tenantName });
      await repos.tenant.save(tenant);
    }

    let user = await repos.user.findOne({ where: { email: "health-check@local" } });
    if (!user) {
      user = repos.user.create({
        email: "health-check@local",
        name: "Health Check",
        tenantId: tenant.id
      });
      await repos.user.save(user);
    }

    await repos.notificationState.save(
      repos.notificationState.create({ userId: user.id })
    );

    return NextResponse.json({
      ok: true,
      entityNames,
      tenantId: tenant.id,
      userId: user.id
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "TypeORM health check failed";
    const stack = err instanceof Error ? err.stack : undefined;
    return NextResponse.json({ ok: false, error: message, stack }, { status: 500 });
  }
}
