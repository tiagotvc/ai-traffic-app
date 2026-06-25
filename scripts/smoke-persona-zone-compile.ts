import "dotenv/config";
import "reflect-metadata";

import { getDataSource } from "../src/db/data-source";
import { repositories } from "../src/db/repositories";
import { compilePersonaZoneTargeting } from "../src/lib/targeting-compiler";

async function main() {
  await getDataSource();
  const { userPersona, userZone } = await repositories();

  const personas = await userPersona.find({ take: 1, order: { updatedAt: "DESC" } });
  const zones = await userZone.find({ take: 1, order: { updatedAt: "DESC" } });

  if (!personas[0] || !zones[0]) {
    console.log("No persona/zone in DB. Create via UI first.");
    process.exit(0);
  }

  const compiled = compilePersonaZoneTargeting(personas[0], zones[0]);
  console.log(JSON.stringify(compiled, null, 2));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
