import "server-only";

import { fetchMyAdAccounts } from "@/lib/meta-graph";
import { listTenantInventory } from "@/lib/meta-discover";

export type MetaAdAccountOption = {
  metaAdAccountId: string;
  label: string;
  metaBusinessId?: string | null;
  metaBusinessName?: string | null;
  isDemo?: boolean;
};

const DEMO_LABEL_SUFFIX_PT = " (Exemplo — não usar)";

function formatLabel(base: string, isDemo: boolean) {
  if (!isDemo) return base;
  if (base.includes("Exemplo") || base.includes("Demo")) return base;
  return `${base}${DEMO_LABEL_SUFFIX_PT}`;
}

/** Contas do inventário Meta (pós-discover) ou fallback live API. */
export async function listMetaAdAccountOptions(input: {
  tenantId: string;
  metaBusinessId?: string | null;
  metaAccessToken?: string;
  hideDemoWhenRealExists?: boolean;
}): Promise<MetaAdAccountOption[]> {
  const inventory = await listTenantInventory(input.tenantId, input.metaBusinessId);
  if (inventory.length) {
    const hasReal = inventory.some((a) => !a.isDemo);
    const hideDemo = input.hideDemoWhenRealExists !== false && hasReal;
    return inventory
      .filter((a) => !(hideDemo && a.isDemo))
      .map((a) => ({
        metaAdAccountId: a.metaAdAccountId,
        label: formatLabel(a.label?.trim() || a.metaAdAccountId, a.isDemo),
        metaBusinessId: a.metaBusinessId,
        metaBusinessName: a.metaBusinessName,
        isDemo: a.isDemo
      }));
  }

  if (!input.metaAccessToken) return [];

  const live = await fetchMyAdAccounts(input.metaAccessToken);
  return live.map((a) => {
    const isDemo = a.id.includes("demo");
    return {
      metaAdAccountId: a.id,
      label: formatLabel(a.name?.trim() || a.id, isDemo),
      metaBusinessId: null,
      metaBusinessName: null,
      isDemo
    };
  });
}

export async function getInventoryMap(tenantId: string) {
  const rows = await listTenantInventory(tenantId);
  return new Map(rows.map((r) => [r.metaAdAccountId, r]));
}
