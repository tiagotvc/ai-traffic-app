import "dotenv/config";
import { DataSource } from "typeorm";
import { postgresOptionsFromUrl } from "../src/db/pg-config";

const ds = new DataSource({
  ...postgresOptionsFromUrl(process.env.DIRECT_URL ?? process.env.DATABASE_URL!),
  synchronize: false
});
await ds.initialize();

const users = await ds.query(`
  SELECT u.id, u.email, u.name, u."facebookId", u."tenantId", t.name AS tenant,
    p.slug AS plan, s.status
  FROM users u
  LEFT JOIN tenants t ON t.id = u."tenantId"
  LEFT JOIN subscriptions s ON s."tenantId" = u."tenantId"
  LEFT JOIN plans p ON p.id = s."planId"
  ORDER BY u."createdAt" DESC
`);
console.log(JSON.stringify(users, null, 2));

const tenants = await ds.query(`
  SELECT t.id, t.name, p.slug, s.status, COUNT(u.id)::int AS users
  FROM tenants t
  LEFT JOIN subscriptions s ON s."tenantId" = t.id
  LEFT JOIN plans p ON p.id = s."planId"
  LEFT JOIN users u ON u."tenantId" = t.id
  GROUP BY t.id, t.name, p.slug, s.status
  ORDER BY t.name
`);
console.log("\nTENANTS:", JSON.stringify(tenants, null, 2));

await ds.destroy();
