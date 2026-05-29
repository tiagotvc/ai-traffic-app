import "reflect-metadata";
import { DataSource } from "typeorm";

import { typeOrmEntities, Tenant } from "./entities/registry";
import { Init1735689600000 } from "./migrations/0001-Init";
import { UserPasswordHash1735689700000 } from "./migrations/0002-UserPasswordHash";
import { GoalsAndCampaignMetrics1735690000000 } from "./migrations/0003-GoalsAndCampaignMetrics";
import { ClientMetaPublish1735690100000 } from "./migrations/0004-ClientMetaPublish";
import { AgencyPlatform1735690200000 } from "./migrations/0005-AgencyPlatform";
import { MetaBusinessAssets1735690300000 } from "./migrations/0006-MetaBusinessAssets";

declare global {
  // eslint-disable-next-line no-var
  var __appDataSource: DataSource | undefined;
}

function buildDataSource() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }

  return new DataSource({
    type: "postgres",
    url,
    entities: [...typeOrmEntities],
    migrations: [
      Init1735689600000,
      UserPasswordHash1735689700000,
      GoalsAndCampaignMetrics1735690000000,
      ClientMetaPublish1735690100000,
      AgencyPlatform1735690200000,
      MetaBusinessAssets1735690300000
    ],
    synchronize: false,
    logging: false
  });
}

function dataSourceHasEntities(ds: DataSource): boolean {
  if (!ds.isInitialized || ds.entityMetadatas.length === 0) return false;
  return ds.entityMetadatas.some(
    (m) => m.target === Tenant || m.name === "Tenant" || m.tableName === "tenants"
  );
}

export async function getDataSource(): Promise<DataSource> {
  const existing = globalThis.__appDataSource;

  if (existing?.isInitialized && dataSourceHasEntities(existing)) {
    return existing;
  }

  if (existing?.isInitialized) {
    await existing.destroy().catch(() => undefined);
  }

  const ds = buildDataSource();
  await ds.initialize();
  globalThis.__appDataSource = ds;
  return ds;
}
