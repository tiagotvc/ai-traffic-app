import "dotenv/config";
import { getDataSource } from "./data-source";

async function main() {
  const ds = await getDataSource();
  try {
    await ds.runMigrations({ transaction: "all" });
  } finally {
    await ds.destroy();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

