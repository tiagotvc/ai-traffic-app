import "dotenv/config";
import { DataSource } from "typeorm";

import { appMigrations } from "../src/db/migrations";
import { postgresOptionsFromUrl } from "../src/db/pg-config";

async function main() {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DIRECT_URL or DATABASE_URL is required");

  const ds = new DataSource({ ...postgresOptionsFromUrl(url), synchronize: false });
  await ds.initialize();

  try {
    const applied = await ds.query(`SELECT name FROM migrations ORDER BY timestamp ASC`);
    const appliedNames = new Set(applied.map((r: { name: string }) => r.name));
    const definedNames = appMigrations.map((m) => m.name);
    const pending = definedNames.filter((n) => !appliedNames.has(n));

    console.log(
      JSON.stringify(
        {
          appliedCount: appliedNames.size,
          definedCount: definedNames.length,
          pending
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
