import "dotenv/config";
import { DataSource } from "typeorm";

import { postgresOptionsFromUrl } from "../src/db/pg-config";

const arg = process.argv[2] ?? "";

if (arg === "--list") {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DIRECT_URL or DATABASE_URL is required");
  const ds = new DataSource({ ...postgresOptionsFromUrl(url), synchronize: false });
  await ds.initialize();
  try {
    const rows = await ds.query(`
      SELECT u.id, u.email, u.name, u."platformRole", t.name AS tenant
      FROM users u
      LEFT JOIN tenants t ON t.id = u."tenantId"
      ORDER BY u.email
    `);
    console.log(JSON.stringify(rows, null, 2));
  } finally {
    await ds.destroy();
  }
  process.exit(0);
}

const email = (arg || process.env.BILLING_ADMIN_EMAILS?.split(",")[0]?.trim() || "")
  .replace(/^"|"$/g, "")
  .toLowerCase();

if (!email) {
  console.error("Uso: tsx scripts/set-platform-admin.ts <email> | --list");
  process.exit(1);
}

async function main() {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DIRECT_URL or DATABASE_URL is required");

  const ds = new DataSource({ ...postgresOptionsFromUrl(url), synchronize: false });
  await ds.initialize();

  try {
    const rows = await ds.query(
      `UPDATE users SET "platformRole" = $1 WHERE LOWER(email) = LOWER($2) RETURNING id, email, "platformRole"`,
      ["admin", email]
    );

    const hit = rows?.[0] as { id: string; email: string; platformRole: string } | undefined;

    if (!hit?.email) {
      const all = await ds.query(`SELECT email, "platformRole" FROM users ORDER BY email`);
      console.error(`Usuario nao encontrado: ${email}`);
      console.error("Usuarios no banco:", all);
      process.exit(1);
    }

    console.log("Admin configurado:", hit);
  } finally {
    await ds.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
