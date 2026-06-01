import "dotenv/config";
import { DataSource } from "typeorm";

import { typeOrmEntities } from "./entities/registry";
import { postgresOptionsFromUrl } from "./pg-config";
import { Init1735689600000 } from "./migrations/0001-Init";
import { UserPasswordHash1735689700000 } from "./migrations/0002-UserPasswordHash";
import { GoalsAndCampaignMetrics1735690000000 } from "./migrations/0003-GoalsAndCampaignMetrics";
import { ClientMetaPublish1735690100000 } from "./migrations/0004-ClientMetaPublish";
import { AgencyPlatform1735690200000 } from "./migrations/0005-AgencyPlatform";
import { MetaBusinessAssets1735690300000 } from "./migrations/0006-MetaBusinessAssets";
import { ClientMetaBusiness1735690400000 } from "./migrations/0007-ClientMetaBusiness";
import { ManagerFeatures1735690500000 } from "./migrations/0008-ManagerFeatures";

async function main() {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DIRECT_URL or DATABASE_URL is required for migrations");
  }

  const ds = new DataSource({
    ...postgresOptionsFromUrl(url),
    entities: [...typeOrmEntities],
    migrations: [
      Init1735689600000,
      UserPasswordHash1735689700000,
      GoalsAndCampaignMetrics1735690000000,
      ClientMetaPublish1735690100000,
      AgencyPlatform1735690200000,
      MetaBusinessAssets1735690300000,
      ClientMetaBusiness1735690400000,
      ManagerFeatures1735690500000
    ],
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
