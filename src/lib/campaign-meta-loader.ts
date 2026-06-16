import "server-only";

import { mapLimit } from "@/lib/concurrency";
import { fetchCampaigns, type MetaCampaign } from "@/lib/meta-graph";
import { isMetaPermissionError } from "@/lib/meta-auth-store";

const ACCOUNT_CONCURRENCY = 3;

export type CampaignMetaRowPatch = {
  status?: string;
  objective?: string | null;
  dailyBudget?: number | null;
};

export type CampaignMetaAccount = {
  id: string;
  metaAdAccountId: string;
  clientId: string;
  label?: string | null;
};

export async function loadCampaignMetadataFromMetaParallel<T extends { metaCampaignId: string }>(input: {
  accounts: CampaignMetaAccount[];
  accessToken: string;
  byId: Map<string, T>;
  clientById: Map<string, { name: string }>;
  slugify: (name: string) => string;
  createRow: (args: {
    acc: CampaignMetaAccount;
    camp: MetaCampaign;
    clientName: string;
    clientSlug: string;
    budgetFromMeta: number | null;
  }) => T;
  patchRow: (row: T, camp: MetaCampaign, budgetFromMeta: number | null) => void;
  onPermissionDenied?: () => void;
}): Promise<{ permissionDenied: boolean }> {
  let permissionDenied = false;

  await mapLimit(input.accounts, ACCOUNT_CONCURRENCY, async (acc) => {
    try {
      const camps = await fetchCampaigns(input.accessToken, acc.metaAdAccountId);
      const client = input.clientById.get(acc.clientId);
      const clientName = client?.name ?? "—";
      const clientSlug = client ? input.slugify(client.name) : "";

      for (const c of camps) {
        if (!c.id) continue;
        const budgetFromMeta = c.daily_budget ? Number(c.daily_budget) / 100 : null;
        if (input.byId.has(c.id)) {
          input.patchRow(input.byId.get(c.id)!, c, budgetFromMeta);
          continue;
        }
        input.byId.set(
          c.id,
          input.createRow({ acc, camp: c, clientName, clientSlug, budgetFromMeta })
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (isMetaPermissionError(msg)) {
        permissionDenied = true;
        input.onPermissionDenied?.();
      }
    }
  });

  return { permissionDenied };
}
