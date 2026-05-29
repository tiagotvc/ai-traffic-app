import "dotenv/config";
import "reflect-metadata";

import { getDataSource } from "../src/db/data-source";
import { repositories } from "../src/db/repositories";

async function main() {
  console.log("Initializing DataSource...");
  const ds = await getDataSource();
  console.log("Entities registered:", ds.entityMetadatas.map((m) => m.name).sort().join(", "));

  console.log("Getting repositories...");
  const repos = await repositories();

  const tenantName = "Tenant typeorm-test.local";
  let tenant = await repos.tenant.findOne({ where: { name: tenantName } });
  if (!tenant) {
    tenant = repos.tenant.create({ name: tenantName, brandName: tenantName });
    await repos.tenant.save(tenant);
  }

  let user = await repos.user.findOne({ where: { email: "typeorm-test@local" } });
  if (!user) {
    user = repos.user.create({
      email: "typeorm-test@local",
      name: "TypeORM Test",
      tenantId: tenant.id
    });
    await repos.user.save(user);
  }

  let client = await repos.client.findOne({
    where: { tenantId: tenant.id, name: "Default" }
  });
  if (!client) {
    client = repos.client.create({ tenantId: tenant.id, name: "Default" });
    await repos.client.save(client);
  }

  console.log("Bootstrap save OK", { tenantId: tenant.id, userId: user.id, clientId: client.id });
  await ds.destroy();
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
