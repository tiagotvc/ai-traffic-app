import "server-only";

import { repositories } from "@/db/repositories";
import { formatMetaAdAccountLabel } from "@/lib/meta-account-label";
import {
  fetchBusinessAdAccounts,
  fetchBusinessPages,
  fetchMyAdAccounts,
  fetchMyBusinesses,
  fetchUserPages
} from "@/lib/meta-graph";

const DEMO_ACCOUNT_ID = "act_demo";

export type MetaDiscoverResult = {
  businesses: number;
  adAccounts: number;
  pages: number;
  businessRows: Array<{
    metaBusinessId: string;
    name: string;
    adAccountCount: number;
    pageCount: number;
  }>;
};

export async function runMetaDiscover(
  tenantId: string,
  metaAccessToken: string
): Promise<MetaDiscoverResult> {
  const {
    metaBusiness: businessRepo,
    metaPage: pageRepo,
    metaAdAccountInventory: inventoryRepo
  } = await repositories();

  const now = new Date();
  const businesses = await fetchMyBusinesses(metaAccessToken);

  const accountKeys = new Set<string>();
  const pageKeys = new Set<string>();
  const businessRows: MetaDiscoverResult["businessRows"] = [];

  if (businesses.length) {
    for (const bm of businesses) {
      const [accounts, pages] = await Promise.all([
        fetchBusinessAdAccounts(metaAccessToken, bm.id),
        fetchBusinessPages(metaAccessToken, bm.id)
      ]);

      let row = await businessRepo.findOne({
        where: { tenantId, metaBusinessId: bm.id }
      });
      if (!row) {
        row = businessRepo.create({
          tenantId,
          metaBusinessId: bm.id,
          name: bm.name ?? bm.id
        });
      } else {
        row.name = bm.name ?? row.name;
      }
      row.lastSyncedAt = now;
      await businessRepo.save(row);

      for (const acc of accounts) {
        accountKeys.add(acc.id);
        const isDemo = acc.id === DEMO_ACCOUNT_ID || acc.id === `act_${DEMO_ACCOUNT_ID}`;
        let inv = await inventoryRepo.findOne({
          where: { tenantId, metaAdAccountId: acc.id }
        });
        if (!inv) {
          inv = inventoryRepo.create({
            tenantId,
            metaAdAccountId: acc.id,
            metaBusinessId: bm.id,
            label: formatMetaAdAccountLabel(acc),
            isDemo
          });
        } else {
          inv.metaBusinessId = bm.id;
          inv.label = formatMetaAdAccountLabel(acc);
          inv.isDemo = isDemo;
        }
        await inventoryRepo.save(inv);
      }

      for (const pg of pages) {
        pageKeys.add(pg.id);
        let row = await pageRepo.findOne({
          where: { tenantId, metaPageId: pg.id }
        });
        if (!row) {
          row = pageRepo.create({
            tenantId,
            metaPageId: pg.id,
            metaBusinessId: bm.id,
            name: pg.name ?? pg.id
          });
        } else {
          row.metaBusinessId = bm.id;
          row.name = pg.name ?? row.name;
        }
        await pageRepo.save(row);
      }

      businessRows.push({
        metaBusinessId: bm.id,
        name: bm.name ?? bm.id,
        adAccountCount: accounts.length,
        pageCount: pages.length
      });
    }
  }

  // Fallback: flat /me/adaccounts + /me/accounts when BM list empty or partial
  const flatAccounts = await fetchMyAdAccounts(metaAccessToken);
  for (const acc of flatAccounts) {
    if (accountKeys.has(acc.id)) continue;
    accountKeys.add(acc.id);
    const isDemo = acc.id === DEMO_ACCOUNT_ID || acc.id.includes("demo");
    let inv = await inventoryRepo.findOne({
      where: { tenantId, metaAdAccountId: acc.id }
    });
    if (!inv) {
      inv = inventoryRepo.create({
        tenantId,
        metaAdAccountId: acc.id,
        metaBusinessId: null,
        label: formatMetaAdAccountLabel(acc),
        isDemo
      });
    } else {
      inv.label = formatMetaAdAccountLabel(acc);
      inv.isDemo = isDemo;
    }
    await inventoryRepo.save(inv);
  }

  const flatPages = await fetchUserPages(metaAccessToken);
  for (const pg of flatPages) {
    if (pageKeys.has(pg.id)) continue;
    pageKeys.add(pg.id);
    let row = await pageRepo.findOne({
      where: { tenantId, metaPageId: pg.id }
    });
    if (!row) {
      row = pageRepo.create({
        tenantId,
        metaPageId: pg.id,
        metaBusinessId: null,
        name: pg.name ?? pg.id
      });
    } else {
      row.name = pg.name ?? row.name;
    }
    await pageRepo.save(row);
  }

  // Remove inventory entries no longer returned (except demo seed)
  const allInv = await inventoryRepo.find({ where: { tenantId } });
  for (const inv of allInv) {
    if (inv.isDemo && inv.metaAdAccountId === DEMO_ACCOUNT_ID) continue;
    if (!accountKeys.has(inv.metaAdAccountId)) {
      await inventoryRepo.remove(inv);
    }
  }

  const stalePages = await pageRepo.find({ where: { tenantId } });
  for (const pg of stalePages) {
    if (!pageKeys.has(pg.metaPageId)) {
      await pageRepo.remove(pg);
    }
  }

  if (!businesses.length) {
    const orphanAccounts = await inventoryRepo.count({ where: { tenantId } });
    const orphanPages = await pageRepo.count({ where: { tenantId } });
    if (orphanAccounts > 0 || orphanPages > 0) {
      businessRows.push({
        metaBusinessId: "unassigned",
        name: "Sem BM (acesso direto)",
        adAccountCount: orphanAccounts,
        pageCount: orphanPages
      });
    }
  }

  return {
    businesses: businesses.length || (businessRows.length ? 1 : 0),
    adAccounts: accountKeys.size,
    pages: pageKeys.size,
    businessRows
  };
}

export async function listTenantBusinessesWithCounts(tenantId: string) {
  const {
    metaBusiness: businessRepo,
    metaPage: pageRepo,
    metaAdAccountInventory: inventoryRepo
  } = await repositories();

  const businesses = await businessRepo.find({
    where: { tenantId },
    order: { name: "ASC" }
  });

  const inv = await inventoryRepo.find({ where: { tenantId } });
  const pages = await pageRepo.find({ where: { tenantId } });

  const rows = businesses.map((b) => ({
    metaBusinessId: b.metaBusinessId,
    name: b.name,
    lastSyncedAt: b.lastSyncedAt?.toISOString() ?? null,
    adAccountCount: inv.filter((a) => a.metaBusinessId === b.metaBusinessId).length,
    pageCount: pages.filter((p) => p.metaBusinessId === b.metaBusinessId).length
  }));

  const unassignedAccounts = inv.filter((a) => !a.metaBusinessId).length;
  const unassignedPages = pages.filter((p) => !p.metaBusinessId).length;
  if (unassignedAccounts > 0 || unassignedPages > 0) {
    rows.push({
      metaBusinessId: "unassigned",
      name: "Sem BM (acesso direto)",
      lastSyncedAt: null,
      adAccountCount: unassignedAccounts,
      pageCount: unassignedPages
    });
  }

  return rows;
}

export async function listTenantPages(tenantId: string, metaBusinessId?: string | null) {
  const { metaPage: pageRepo } = await repositories();
  const pages = await pageRepo.find({ where: { tenantId }, order: { name: "ASC" } });
  if (metaBusinessId === "unassigned") {
    return pages.filter((p) => !p.metaBusinessId);
  }
  if (metaBusinessId) {
    return pages.filter((p) => p.metaBusinessId === metaBusinessId);
  }
  return pages;
}

export async function listTenantInventory(
  tenantId: string,
  metaBusinessId?: string | null
) {
  const { metaAdAccountInventory: inventoryRepo, metaBusiness: businessRepo } =
    await repositories();
  const inv = await inventoryRepo.find({ where: { tenantId }, order: { label: "ASC" } });
  const businesses = await businessRepo.find({ where: { tenantId } });
  const bmName = new Map(businesses.map((b) => [b.metaBusinessId, b.name]));

  let filtered = inv;
  if (metaBusinessId === "unassigned") {
    filtered = inv.filter((a) => !a.metaBusinessId);
  } else if (metaBusinessId) {
    filtered = inv.filter((a) => a.metaBusinessId === metaBusinessId);
  }

  return filtered.map((a) => ({
    metaAdAccountId: a.metaAdAccountId,
    label: a.label ?? a.metaAdAccountId,
    metaBusinessId: a.metaBusinessId,
    metaBusinessName: a.metaBusinessId ? bmName.get(a.metaBusinessId) ?? null : null,
    isDemo: a.isDemo
  }));
}

export async function getBusinessNameMap(tenantId: string) {
  const { metaBusiness: businessRepo } = await repositories();
  const rows = await businessRepo.find({ where: { tenantId } });
  return new Map(rows.map((b) => [b.metaBusinessId, b.name]));
}
