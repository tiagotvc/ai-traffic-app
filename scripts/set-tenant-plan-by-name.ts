import "dotenv/config";
import { DataSource } from "typeorm";
import { postgresOptionsFromUrl } from "../src/db/pg-config";

const tenantName = process.argv[2]?.trim();
const planSlug = (process.argv[3] ?? "agency").toLowerCase().trim();

if (!tenantName) {
  console.error("Uso: tsx scripts/set-tenant-plan-by-name.ts <tenantName> [planSlug]");
  process.exit(1);
}

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
  const tenants = await ds.query(`SELECT id, name FROM tenants WHERE name = $1`, [tenantName]);
  const tenant = tenants[0] as { id: string; name: string } | undefined;
  if (!tenant) {
    console.error("Tenant nao encontrado:", tenantName);
    process.exit(1);
  }

  const plans = await ds.query(`SELECT id, slug, name FROM plans WHERE slug = $1`, [planSlug]);
  const plan = plans[0] as { id: string; slug: string; name: string };
  const now = new Date();
  const periodEnd = addYears(now, 1);

  const existing = await ds.query(`SELECT id FROM subscriptions WHERE "tenantId" = $1`, [tenant.id]);
  if (existing[0]?.id) {
    await ds.query(
      `UPDATE subscriptions SET "planId"=$1, status='active', "billingCycle"='yearly',
       "currentPeriodStart"=$2, "currentPeriodEnd"=$3, "updatedAt"=NOW()
       WHERE "tenantId"=$4`,
      [plan.id, now, periodEnd, tenant.id]
    );
  } else {
    await ds.query(
      `INSERT INTO subscriptions ("tenantId","planId",status,"billingCycle","currentPeriodStart","currentPeriodEnd","cancelAtPeriodEnd")
       VALUES ($1,$2,'active','yearly',$3,$4,false)`,
      [tenant.id, plan.id, now, periodEnd]
    );
  }

  console.log(JSON.stringify({ ok: true, tenant: tenant.name, plan: plan.slug, until: periodEnd }, null, 2));
} finally {
  await ds.destroy();
}
