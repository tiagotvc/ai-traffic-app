import "reflect-metadata";
import { DataSource } from "typeorm";

import { typeOrmEntities } from "./entities/registry";
import { appMigrations } from "./migrations";
import { postgresOptionsFromUrl } from "./pg-config";

const EXPECTED_ENTITY_COUNT = typeOrmEntities.length;

declare global {
  // eslint-disable-next-line no-var
  var __appDataSource: DataSource | undefined;
  // eslint-disable-next-line no-var
  var __appDataSourceInit: Promise<DataSource> | undefined;
}

function buildDataSource() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is required. On Vercel, set it to the Supabase pooler URL (port 6543, ?pgbouncer=true)."
    );
  }

  return new DataSource({
    ...postgresOptionsFromUrl(url),
    entities: [...typeOrmEntities],
    migrations: [...appMigrations],
    synchronize: false,
    logging: process.env.NODE_ENV === "development"
  });
}

function dataSourceHasEntities(ds: DataSource): boolean {
  if (!ds.isInitialized || ds.entityMetadatas.length === 0) return false;
  return (
    ds.entityMetadatas.length >= EXPECTED_ENTITY_COUNT &&
    ds.entityMetadatas.some((m) => m.name === "Tenant" && m.tableName === "tenants")
  );
}

export async function getDataSource(): Promise<DataSource> {
  const existing = globalThis.__appDataSource;

  if (existing?.isInitialized && dataSourceHasEntities(existing)) {
    try {
      await existing.query("SELECT 1");
      return existing;
    } catch {
      await existing.destroy().catch(() => undefined);
      globalThis.__appDataSource = undefined;
    }
  } else if (existing?.isInitialized) {
    await existing.destroy().catch(() => undefined);
    globalThis.__appDataSource = undefined;
  }

  if (globalThis.__appDataSourceInit) {
    return globalThis.__appDataSourceInit;
  }

  globalThis.__appDataSourceInit = (async () => {
    const ds = buildDataSource();
    await ds.initialize();
    await runPendingMigrations(ds);
    globalThis.__appDataSource = ds;
    return ds;
  })();

  try {
    return await globalThis.__appDataSourceInit;
  } finally {
    globalThis.__appDataSourceInit = undefined;
  }
}

/** Chave estável para serializar migrações entre workers/processos do Next.js dev. */
const MIGRATION_ADVISORY_LOCK_KEY = 8394721;

/**
 * Aplica migrações pendentes na inicialização, garantindo que o schema acompanhe o
 * código em produção sem depender do build do Vercel (que não roda o db:migrate).
 * Migrações são idempotentes e transacionais. Em caso de falha,
 * loga e segue — não derruba o app (uma proxima inicialização tenta de novo).
 */
async function runPendingMigrations(ds: DataSource): Promise<void> {
  try {
    await ds.query("SELECT pg_advisory_lock($1)", [MIGRATION_ADVISORY_LOCK_KEY]);
    try {
      const applied = await ds.runMigrations({ transaction: "each" });
      if (applied.length) {
        // eslint-disable-next-line no-console
        console.log(
          `[migrations] aplicadas ${applied.length}:`,
          applied.map((m) => m.name).join(", ")
        );
      }
    } finally {
      await ds.query("SELECT pg_advisory_unlock($1)", [MIGRATION_ADVISORY_LOCK_KEY]);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[migrations] falha ao aplicar (seguindo sem derrubar o app):", err);
  }
}
