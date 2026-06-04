import "dotenv/config";
import { DataSource } from "typeorm";

import { typeOrmEntities } from "./entities/registry";
import { appMigrations } from "./migrations";
import { postgresOptionsFromUrl } from "./pg-config";

async function main() {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DIRECT_URL or DATABASE_URL is required for migrations");
  }

  const ds = new DataSource({
    ...postgresOptionsFromUrl(url),
    entities: [...typeOrmEntities],
    migrations: [...appMigrations],
    synchronize: false,
    logging: true
  });

  await ds.initialize();
  try {
    const applied = await ds.runMigrations({ transaction: "all" });
    if (applied.length) {
      // eslint-disable-next-line no-console
      console.log(`Applied ${applied.length} migration(s):`, applied.map((m) => m.name).join(", "));
    } else {
      // eslint-disable-next-line no-console
      console.log("No pending migrations.");
    }
  } finally {
    await ds.destroy();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
