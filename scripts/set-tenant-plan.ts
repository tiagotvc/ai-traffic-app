import "dotenv/config";
import { DataSource } from "typeorm";

import { postgresOptionsFromUrl } from "../src/db/pg-config";

const email = (process.argv[2] ?? "").toLowerCase().trim();
const planSlug = (process.argv[3] ?? "agency").toLowerCase().trim();

if (!email) {
  console.error("Uso: tsx scripts/set-tenant-plan.ts <email> [planSlug]");
  console.error("Planos: free | basic | advanced | agency (default: agency)");
  process.exit(1);
}

function addYears(date: Date, years: number): Date {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

async function main() {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DIRECT_URL or DATABASE_URL is required");

  const ds = new DataSource({ ...postgresOptionsFromUrl(url), synchronize: false });
  await ds.initialize();

  try {
    const users = await ds.query(
      `SELECT u.id, u.email, u.name, u."tenantId", t.name AS tenant_name
       FROM users u
       JOIN tenants t ON t.id = u."tenantId"
       WHERE LOWER(u.email) = LOWER($1)`,
      [email]
    );
    const user = users[0] as
      | { id: string; email: string; name: string; tenantId: string; tenant_name: string }
      | undefined;
    if (!user) {
      console.error(`Usuario nao encontrado: ${email}`);
      process.exit(1);
    }

    const plans = await ds.query(`SELECT id, slug, name FROM plans WHERE slug = $1`, [planSlug]);
    const plan = plans[0] as { id: string; slug: string; name: string } | undefined;
    if (!plan) {
      const all = await ds.query(`SELECT slug, name FROM plans ORDER BY "sortOrder"`);
      console.error(`Plano nao encontrado: ${planSlug}`);
      console.error("Planos disponiveis:", all);
      process.exit(1);
    }

    const now = new Date();
    const periodEnd = addYears(now, 1);

    const existing = await ds.query(
      `SELECT id FROM subscriptions WHERE "tenantId" = $1`,
      [user.tenantId]
    );

    let subId: string;
    if (existing[0]?.id) {
      const updated = await ds.query(
        `UPDATE subscriptions SET
          "planId" = $1,
          status = 'active',
          "billingCycle" = 'yearly',
          "currentPeriodStart" = $2,
          "currentPeriodEnd" = $3,
          "gracePeriodEndsAt" = NULL,
          "canceledAt" = NULL,
          "cancelAtPeriodEnd" = false,
          "updatedAt" = NOW()
        WHERE "tenantId" = $4
        RETURNING id`,
        [plan.id, now, periodEnd, user.tenantId]
      );
      subId = updated[0].id;
    } else {
      const inserted = await ds.query(
        `INSERT INTO subscriptions (
          "tenantId", "planId", status, "billingCycle",
          "currentPeriodStart", "currentPeriodEnd", "cancelAtPeriodEnd"
        ) VALUES ($1, $2, 'active', 'yearly', $3, $4, false)
        RETURNING id`,
        [user.tenantId, plan.id, now, periodEnd]
      );
      subId = inserted[0].id;
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          user: { email: user.email, name: user.name },
          tenant: user.tenant_name,
          tenantId: user.tenantId,
          subscriptionId: subId,
          plan: { slug: plan.slug, name: plan.name },
          status: "active",
          currentPeriodEnd: periodEnd.toISOString()
        },
        null,
        2
      )
    );
  } finally {
    await ds.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
