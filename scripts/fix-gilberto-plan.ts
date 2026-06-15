import "dotenv/config";
import { DataSource } from "typeorm";
import { postgresOptionsFromUrl } from "../src/db/pg-config";

const GILBERTO_EMAIL = "ilustre.jr@gmail.com";
const PLAN_SLUG = "agency";

function addYears(date: Date, years: number): Date {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

const ds = new DataSource({
  ...postgresOptionsFromUrl(process.env.DIRECT_URL ?? process.env.DATABASE_URL!),
  synchronize: false
});
await ds.initialize();

try {
  const orphanTenants = await ds.query(
    `SELECT t.id, t.name FROM tenants t WHERE t.name = 'Tenant gmail.com'`
  );

  const gilbertoRows = await ds.query(
    `SELECT u.id AS user_id, u."tenantId" AS tenant_id, t.name AS tenant_name
     FROM users u
     JOIN tenants t ON t.id = u."tenantId"
     WHERE LOWER(u.email) = LOWER($1)`,
    [GILBERTO_EMAIL]
  );
  const gilberto = gilbertoRows[0] as
    | { user_id: string; tenant_id: string; tenant_name: string }
    | undefined;

  if (!gilberto) {
    console.error("Gilberto nao encontrado");
    process.exit(1);
  }

  const gilbertoAiTenant = await ds.query(
    `SELECT id, name FROM tenants WHERE name = 'Gilberto AI' LIMIT 1`
  );
  const targetTenantId =
    (gilbertoAiTenant[0]?.id as string | undefined) ?? gilberto.tenant_id;

  if (gilberto.tenant_id !== targetTenantId) {
    await ds.query(`UPDATE users SET "tenantId" = $1 WHERE id = $2`, [
      targetTenantId,
      gilberto.user_id
    ]);
    console.log("Usuario movido para tenant Gilberto AI");
  }

  for (const orphan of orphanTenants as { id: string; name: string }[]) {
    if (orphan.id === targetTenantId) continue;
    await ds.query(`DELETE FROM subscriptions WHERE "tenantId" = $1`, [orphan.id]);
    await ds.query(`DELETE FROM tenant_members WHERE "tenantId" = $1`, [orphan.id]);
    await ds.query(`DELETE FROM clients WHERE "tenantId" = $1`, [orphan.id]);
    await ds.query(`DELETE FROM tenants WHERE id = $1`, [orphan.id]);
    console.log("Tenant orfao removido:", orphan.name, orphan.id);
  }

  const plans = await ds.query(`SELECT id FROM plans WHERE slug = $1`, [PLAN_SLUG]);
  const planId = plans[0]?.id as string | undefined;
  if (!planId) throw new Error(`Plano ${PLAN_SLUG} nao encontrado`);

  const now = new Date();
  const periodEnd = addYears(now, 1);
  const existingSub = await ds.query(
    `SELECT id FROM subscriptions WHERE "tenantId" = $1`,
    [targetTenantId]
  );

  if (existingSub[0]?.id) {
    await ds.query(
      `UPDATE subscriptions SET
        "planId" = $1, status = 'active', "billingCycle" = 'yearly',
        "currentPeriodStart" = $2, "currentPeriodEnd" = $3,
        "gracePeriodEndsAt" = NULL, "canceledAt" = NULL, "cancelAtPeriodEnd" = false,
        "updatedAt" = NOW()
      WHERE "tenantId" = $4`,
      [planId, now, periodEnd, targetTenantId]
    );
  } else {
    await ds.query(
      `INSERT INTO subscriptions (
        "tenantId", "planId", status, "billingCycle",
        "currentPeriodStart", "currentPeriodEnd", "cancelAtPeriodEnd"
      ) VALUES ($1, $2, 'active', 'yearly', $3, $4, false)`,
      [targetTenantId, planId, now, periodEnd]
    );
  }

  await ds.query(
    `INSERT INTO tenant_members ("tenantId", "userId", role)
     VALUES ($1, $2, 'admin')
     ON CONFLICT DO NOTHING`,
    [targetTenantId, gilberto.user_id]
  );

  const verify = await ds.query(
    `SELECT u.email, t.name AS tenant, p.slug AS plan, s.status
     FROM users u
     JOIN tenants t ON t.id = u."tenantId"
     LEFT JOIN subscriptions s ON s."tenantId" = t.id
     LEFT JOIN plans p ON p.id = s."planId"
     WHERE u.email = $1`,
    [GILBERTO_EMAIL]
  );
  console.log("OK:", JSON.stringify(verify[0], null, 2));
} finally {
  await ds.destroy();
}
