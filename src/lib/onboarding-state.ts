import "server-only";

import { repositories } from "@/db/repositories";
import { isSystemDefaultClient } from "@/lib/demo-data";

/** Tenant tem pelo menos um cliente real (não Default de scaffolding). */
export async function tenantHasRealClients(tenantId: string): Promise<boolean> {
  const { client: clientRepo } = await repositories();
  const rows = await clientRepo.find({ where: { tenantId } });
  return rows.some((c) => !isSystemDefaultClient(c));
}

/** Remove clientes Default de scaffolding quando já existem clientes reais. */
export async function cleanupScaffoldDefaultClients(tenantId: string): Promise<number> {
  const { client: clientRepo } = await repositories();
  const rows = await clientRepo.find({ where: { tenantId } });
  const real = rows.filter((c) => !isSystemDefaultClient(c));
  if (real.length === 0) return 0;

  const scaffold = rows.filter((c) => isSystemDefaultClient(c));
  if (!scaffold.length) return 0;

  await clientRepo.remove(scaffold);
  return scaffold.length;
}
