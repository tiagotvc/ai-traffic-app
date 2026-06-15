import "dotenv/config";
import { DataSource } from "typeorm";
import { postgresOptionsFromUrl } from "../src/db/pg-config";

const ds = new DataSource({
  ...postgresOptionsFromUrl(process.env.DIRECT_URL ?? process.env.DATABASE_URL!),
  synchronize: false
});
await ds.initialize();

const subs = await ds.query(`
  SELECT
    u.email,
    u.name,
    t.id AS tenant_id,
    t.name AS tenant_name,
    s.id AS sub_id,
    s.status,
    s."billingCycle",
    s."currentPeriodStart",
    s."currentPeriodEnd",
    s."gracePeriodEndsAt",
    p.slug AS plan_slug,
    p.name AS plan_name,
    p.limits
  FROM users u
  JOIN tenants t ON t.id = u."tenantId"
  LEFT JOIN subscriptions s ON s."tenantId" = u."tenantId"
  LEFT JOIN plans p ON p.id = s."planId"
  ORDER BY u.email
`);
console.log(JSON.stringify(subs, null, 2));

const plans = await ds.query(`SELECT slug, name, "isActive" FROM plans ORDER BY "sortOrder"`);
console.log("\nPLANS:", JSON.stringify(plans, null, 2));

await ds.destroy();
