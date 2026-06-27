import "server-only";

import { repositories } from "@/db/repositories";
import { isValidAttributionPreset, resolveAttributionWindows } from "@/lib/meta-attribution";

export async function getTenantAttributionWindow(tenantId: string): Promise<string | null> {
  const { tenant: repo } = await repositories();
  const t = await repo.findOne({ where: { id: tenantId } });
  return t?.attributionWindow ?? null;
}

export async function setTenantAttributionWindow(
  tenantId: string,
  preset: string | null
): Promise<string | null> {
  const { tenant: repo } = await repositories();
  const t = await repo.findOne({ where: { id: tenantId } });
  if (!t) return null;
  t.attributionWindow = preset && isValidAttributionPreset(preset) ? preset : null;
  await repo.save(t);
  return t.attributionWindow ?? null;
}

/**
 * Resolve as janelas de atribuição efetivas do tenant para passar à Graph API
 * (`action_attribution_windows`). Retorna `null` (sem alteração) quando a flag
 * `meta.attribution` está OFF ou não há preferência — preservando o comportamento
 * atual dos relatórios. **Ponto de plugagem** para o pipeline de insights.
 */
export async function resolveTenantAttributionWindows(tenantId: string): Promise<string[] | null> {
  const { isAttributionEnabled } = await import("@/lib/meta-attribution");
  if (!(await isAttributionEnabled())) return null;
  return resolveAttributionWindows(await getTenantAttributionWindow(tenantId));
}
