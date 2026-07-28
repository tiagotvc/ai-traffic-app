import "dotenv/config";
import { DataSource } from "typeorm";

import { postgresOptionsFromUrl } from "../src/db/pg-config";

const code = (process.argv[2] ?? "TESTE99").toUpperCase().trim();
const percentOff = Number(process.argv[3] ?? 99);

async function main() {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DIRECT_URL or DATABASE_URL is required");

  const ds = new DataSource({ ...postgresOptionsFromUrl(url), synchronize: false });
  await ds.initialize();

  try {
    const existing = await ds.query(`SELECT id FROM discount_coupons WHERE code = $1`, [code]);
    if (existing[0]) {
      await ds.query(
        `UPDATE discount_coupons SET "percentOff" = $1, "isActive" = true, "minChargeCents" = 500, "maxUses" = 1, "usedCount" = 0
         WHERE code = $2`,
        [percentOff, code]
      );
      console.log(JSON.stringify({ ok: true, action: "updated", code, percentOff }, null, 2));
      return;
    }

    const inserted = await ds.query(
      `INSERT INTO discount_coupons (code, "percentOff", "maxUses", "isActive", "minChargeCents", description)
       VALUES ($1, $2, 1, true, 500, 'Cupom de teste - QA de ativacao de conta')
       RETURNING id, code, "percentOff", "minChargeCents", "maxUses"`,
      [code, percentOff]
    );
    console.log(JSON.stringify({ ok: true, action: "created", coupon: inserted[0] }, null, 2));
  } finally {
    await ds.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
