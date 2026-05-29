import "reflect-metadata";
import { DataSource } from "typeorm";

import { typeOrmEntities } from "./entities/registry";
import { postgresOptionsFromUrl } from "./pg-config";

const EXPECTED_ENTITY_COUNT = typeOrmEntities.length;

declare global {
  // eslint-disable-next-line no-var
  var __appDataSource: DataSource | undefined;
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

  const ds = buildDataSource();
  await ds.initialize();
  globalThis.__appDataSource = ds;
  return ds;
}
