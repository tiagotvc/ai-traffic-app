import "dotenv/config";

import { DataSource } from "typeorm";

import { postgresOptionsFromUrl } from "../src/db/pg-config";

const emails = process.argv.slice(2).map((email) => email.toLowerCase().trim());
if (emails.length === 0) throw new Error("Informe ao menos um email para auditar");

const ds = new DataSource({
  ...postgresOptionsFromUrl(process.env.DIRECT_URL ?? process.env.DATABASE_URL!),
  synchronize: false
});

await ds.initialize();
try {
  const rows = await ds.query(
    `SELECT u.id AS user_id, u.email, u."tenantId" AS tenant_id,
       t.name AS tenant_name, tm.role, p.slug AS plan_slug,
       s.status AS subscription_status, s."currentPeriodStart", s."currentPeriodEnd",
       (SELECT COUNT(*)::int FROM users u2 WHERE u2."tenantId" = t.id) AS tenant_user_count,
       (SELECT COUNT(*)::int FROM tenant_members tm2 WHERE tm2."tenantId" = t.id) AS member_count,
       (SELECT COUNT(*)::int FROM clients c WHERE c."tenantId" = t.id) AS client_count
     FROM users u
     JOIN tenants t ON t.id = u."tenantId"
     LEFT JOIN tenant_members tm ON tm."userId" = u.id AND tm."tenantId" = t.id
     LEFT JOIN subscriptions s ON s."tenantId" = t.id
     LEFT JOIN plans p ON p.id = s."planId"
     WHERE LOWER(u.email) = ANY($1)
     ORDER BY u.email`,
    [emails]
  );
  console.log(JSON.stringify(rows, null, 2));

  const tenantIds = [...new Set(rows.map((row: { tenant_id: string }) => row.tenant_id))];
  for (const tenantId of tenantIds) {
    const columns = (await ds.query(
      `SELECT table_name
       FROM information_schema.columns
       WHERE table_schema = 'public' AND column_name = 'tenantId'
       ORDER BY table_name`
    )) as Array<{ table_name: string }>;
    const counts: Record<string, number> = {};
    for (const { table_name: tableName } of columns) {
      if (!/^[a-zA-Z0-9_]+$/.test(tableName)) continue;
      const result = await ds.query(
        `SELECT COUNT(*)::int AS count FROM "${tableName}" WHERE "tenantId" = $1`,
        [tenantId]
      );
      if (result[0].count > 0) counts[tableName] = result[0].count;
    }
    console.log(JSON.stringify({ tenantId, populatedTenantTables: counts }, null, 2));
  }
} finally {
  await ds.destroy();
}
