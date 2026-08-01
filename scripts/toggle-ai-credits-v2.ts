import "dotenv/config";
import { getAiCreditsFeatureFlags, updateAiCreditsFeatureFlags } from "../src/lib/ai-credits/feature-flags";

/**
 * Liga/desliga a camada de créditos v2 (pesos por ação, em vez do contador legado
 * de 4 tipos fixos). Uso: tsx scripts/toggle-ai-credits-v2.ts on|off
 */
async function main() {
  const arg = process.argv[2];
  if (arg !== "on" && arg !== "off") {
    console.error("Uso: tsx scripts/toggle-ai-credits-v2.ts on|off");
    process.exit(1);
  }

  const before = await getAiCreditsFeatureFlags();
  console.log("antes:", before);
  const after = await updateAiCreditsFeatureFlags({ creditsV2Enabled: arg === "on" });
  console.log("depois:", after);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("falhou:", e);
    process.exit(1);
  });
