import "dotenv/config";
import { DataSource } from "typeorm";
import { postgresOptionsFromUrl } from "../src/db/pg-config";

const ds = new DataSource({
  ...postgresOptionsFromUrl(process.env.DIRECT_URL ?? process.env.DATABASE_URL!),
  synchronize: false
});
await ds.initialize();

const members = await ds.query(`
  SELECT tm."userId", tm."tenantId", tm.role, u.email, u.name, t.name AS tenant_name
  FROM tenant_members tm
  JOIN users u ON u.id = tm."userId"
  JOIN tenants t ON t.id = tm."tenantId"
  ORDER BY u.email
`);
console.log("MEMBERS:", JSON.stringify(members, null, 2));

const gilberto = await ds.query(`
  SELECT u.*, 
    (SELECT json_agg(row_to_json(s)) FROM subscriptions s WHERE s."tenantId" = u."tenantId") AS subs
  FROM users u
  WHERE u.email ILIKE '%ilustre%' OR u.name ILIKE '%gilberto%'
`);
console.log("GILBERTO USERS:", JSON.stringify(gilberto, null, 2));

const metaAuth = await ds.query(`
  SELECT ma."userId", u.email, u."facebookId", ma."expiresAt"
  FROM meta_auth ma
  JOIN users u ON u.id = ma."userId"
  WHERE u.email ILIKE '%ilustre%' OR u.name ILIKE '%gilberto%'
`);
console.log("META AUTH:", JSON.stringify(metaAuth, null, 2));

await ds.destroy();
