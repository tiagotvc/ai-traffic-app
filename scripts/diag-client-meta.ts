import "dotenv/config";
import "reflect-metadata";

import { repositories } from "../src/db/repositories";
import { getDataSource } from "../src/db/data-source";

/**
 * Diagnóstico: por que um cliente puxa dados do Meta e o outro não.
 * Mostra metaBusinessId de cada cliente, o inventário de contas do tenant e
 * quais contas "batem" com o escopo de cada cliente (matchesClientBusinessScope).
 *
 * Uso (contra produção):
 *   $env:DATABASE_URL="postgresql://...prod..."
 *   npx tsx scripts/diag-client-meta.ts "Instituto Gabriela Dawson" "Gabriela Dawson"
 */
function matchesScope(accBm: string | null | undefined, clientBm: string | null): boolean {
  if (!clientBm || clientBm === "unassigned") return true;
  if (!accBm) return false;
  return accBm === clientBm;
}

async function main() {
  const names = process.argv.slice(2);
  const targets = names.length ? names : ["Instituto Gabriela Dawson", "Gabriela Dawson"];

  const repos = await repositories();

  for (const name of targets) {
    console.log("\n========================================");
    console.log(`CLIENTE: "${name}"`);
    console.log("========================================");

    const clients = await repos.client.find({ where: { name } });
    if (!clients.length) {
      console.log("  ❌ Nenhum cliente com esse nome exato.");
      const all = await repos.client.find();
      const term = name.toLowerCase().split(" ")[0];
      const close = all.filter((c) => c.name.toLowerCase().includes(term));
      close.forEach((c) => console.log(`    parecido: "${c.name}" (id=${c.id})`));
      continue;
    }

    for (const client of clients) {
      const clientBm = client.metaBusinessId?.trim() || null;
      console.log(`\n  Client.id      = ${client.id}`);
      console.log(`  tenantId       = ${client.tenantId}`);
      console.log(`  metaBusinessId = ${clientBm ?? "(null → mostra TODAS as contas)"}`);

      // AdAccounts vinculadas diretamente a este cliente
      const adAccounts = await repos.adAccount.find({ where: { clientId: client.id } });
      console.log(`\n  AdAccounts vinculadas diretamente: ${adAccounts.length}`);
      adAccounts.forEach((a) =>
        console.log(`    - ${a.metaAdAccountId}  business=${a.metaBusinessId ?? "(null)"}  label="${a.label ?? ""}"`)
      );

      // Inventário do tenant e quais contas passam no filtro de escopo do cliente
      const inv = await repos.metaAdAccountInventory.find({ where: { tenantId: client.tenantId } });
      const visible = inv.filter((a) => matchesScope(a.metaBusinessId, clientBm));
      console.log(`\n  Inventário do tenant: ${inv.length} contas`);
      console.log(`  → Visíveis para ESTE cliente (após filtro de BM): ${visible.length}`);
      if (clientBm && visible.length === 0 && inv.length > 0) {
        console.log(`  ⚠️  O cliente está escopado ao BM "${clientBm}", mas NENHUMA conta do inventário tem esse metaBusinessId.`);
        const bms = new Set(inv.map((a) => a.metaBusinessId ?? "(null/unassigned)"));
        console.log(`     BMs presentes no inventário: ${[...bms].join(", ")}`);
      }

      const settings = await repos.clientMetaSettings.findOne({ where: { clientId: client.id } });
      console.log(`\n  syncEnabled = ${settings ? settings.syncEnabled : "(sem ClientMetaSettings)"}`);
    }
  }

  // BMs descobertos no tenant
  console.log("\n========================================");
  console.log("BUSINESS MANAGERS descobertos (meta_business)");
  console.log("========================================");
  const businesses = await repos.metaBusiness.find();
  if (!businesses.length) console.log("  (nenhum BM descoberto)");
  businesses.forEach((b: any) => console.log(`  ${b.metaBusinessId}  "${b.name}"`));

  const ds = await getDataSource();
  await ds.destroy();
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
