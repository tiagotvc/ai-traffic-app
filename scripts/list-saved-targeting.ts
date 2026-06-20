import "dotenv/config";
import pg from "pg";

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL não configurada");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  connectionTimeoutMillis: 10_000,
  query_timeout: 10_000
});

async function main() {
  await client.connect();

  const saved = await client.query(`
    SELECT id, name, "metaAdAccountId", "clientId", "metaSavedAudienceId", "createdAt"
    FROM client_saved_targeting
    ORDER BY "createdAt" DESC
    LIMIT 50
  `);

  const count = await client.query(`SELECT COUNT(*)::int AS n FROM client_saved_targeting`);

  console.log("=== Públicos salvos (Traffic AI / client_saved_targeting) ===");
  console.log("Total:", count.rows[0]?.n ?? 0);
  if (!saved.rows.length) {
    console.log("(nenhum registro)");
  } else {
    for (const row of saved.rows) {
      console.log(JSON.stringify(row, null, 0));
    }
  }

  const cache = await client.query(`
    SELECT "metaAdAccountId", jsonb_array_length(audiences) AS audience_count, "fetchedAt"
    FROM meta_audience_cache
    ORDER BY "fetchedAt" DESC
    LIMIT 10
  `);

  console.log("\n=== Cache custom audiences (meta_audience_cache) ===");
  if (!cache.rows.length) {
    console.log("(nenhum cache)");
  } else {
    for (const row of cache.rows) {
      console.log(JSON.stringify(row, null, 0));
    }
  }

  await client.end();
}

main().catch((e) => {
  console.error("Erro:", e instanceof Error ? e.message : e);
  process.exit(1);
});
