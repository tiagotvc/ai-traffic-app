import "dotenv/config";
import { DataSource } from "typeorm";

import { postgresOptionsFromUrl } from "../src/db/pg-config";

async function main() {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DIRECT_URL or DATABASE_URL is required");

  const ds = new DataSource({ ...postgresOptionsFromUrl(url), synchronize: false });
  await ds.initialize();
  try {
    const rows = await ds.query(
      `SELECT code, "percentOff", "minChargeCents", "maxUses", "usedCount", "isActive"
       FROM discount_coupons ORDER BY "createdAt" DESC LIMIT 5`
    );
    console.log(JSON.stringify(rows, null, 2));
  } finally {
    await ds.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
