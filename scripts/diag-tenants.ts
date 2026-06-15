import "dotenv/config";
import { DataSource } from "typeorm";
import { postgresOptionsFromUrl } from "../src/db/pg-config";

const ds = new DataSource({
  ...postgresOptionsFromUrl(process.env.DIRECT_URL ?? process.env.DATABASE_URL!),
  synchronize: false
});
await ds.initialize();

const tenants = await ds.query(`
  SELECT t.id, t.name, t."brandName",
    (SELECT p.slug FROM subscriptions s JOIN plans p ON p.id = s."planId" WHERE s."tenantId" = t.id LIMIT 1) AS plan_slug,
    (SELECT s.status FROM subscriptions s WHERE s."tenantId" = t.id LIMIT 1) AS sub_status
  FROM tenants t
  WHERE t.name ILIKE '%gilberto%' OR t.name ILIKE '%gmail%' OR t.name ILIKE '%ilustre%'
  ORDER BY t.name
`);
console.log("TENANTS:", JSON.stringify(tenants, null, 2));

const allTenants = await ds.query(`SELECT id, name FROM tenants ORDER BY name`);
console.log("ALL TENANTS:", JSON.stringify(allTenants, null, 2));

await ds.destroy();
